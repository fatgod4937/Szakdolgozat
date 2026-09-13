import {
  ConflictException,
  ForbiddenException,
  HttpException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { hashPassword, verifyPassword } from './utils/password-hash.util';

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

type RefreshTokenPayload = AuthTokenPayload & {
  tokenType: 'refresh';
};

const safeUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  isVerified: true,
  profilePictureUrl: true,
  bio: true,
  location: true,
  latitude: true,
  longitude: true,
  deactivation: {
    select: { reason: true, deactivatedAt: true },
  },
} satisfies Prisma.UserSelect;

const authUserSelect = {
  ...safeUserSelect,
  passwordHash: true,
} satisfies Prisma.UserSelect;

type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;
type AuthUser = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      if (!registerDto.passwordHash) {
        throw new BadRequestException('passwordHash is required.');
      }

      if (registerDto.acceptDataSafety !== true) {
        throw new BadRequestException(
          'You must accept the Data Safety policy.',
        );
      }

      const existingUser = await this.prismaService.user.findUnique({
        where: { email: registerDto.email },
        select: {
          id: true,
        },
      });

      if (existingUser) {
        throw new ConflictException('A user with this email already exists.');
      }

      const role =
        registerDto.role ?? this.resolveRole(registerDto.accountType);

      const verificationToken = randomBytes(32).toString('hex');
      const phoneNumber = this.normalizePhoneNumber(registerDto.phoneNumber);
      const user = await this.prismaService.user.create({
        data: {
          email: registerDto.email,
          passwordHash: hashPassword(registerDto.passwordHash),
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          phoneNumber,
          role,
          emailVerificationTokenHash:
            this.hashVerificationToken(verificationToken),
          emailVerificationExpiresAt: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ),
        },
        select: authUserSelect,
      });

      await this.sendVerificationEmail(
        user.email,
        user.firstName,
        verificationToken,
      );

      return {
        message: 'Check your email to verify your account before logging in.',
      };
    } catch (error) {
      this.logRegisterError(error, registerDto);

      if (error instanceof HttpException) {
        throw error;
      }

      if (this.isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('A user with this email already exists.');
      }

      const message =
        error instanceof Error ? error.message : 'Registration failed';

      throw new InternalServerErrorException(message);
    }
  }

  async login(loginDto: LoginDto) {
    if (!loginDto.passwordHash) {
      throw new BadRequestException('passwordHash is required.');
    }

    const user = await this.findUserByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new ForbiddenException({
        message: 'ACCOUNT_DEACTIVATED',
        code: 'ACCOUNT_DEACTIVATED',
        deactivatedAt: user.deactivation?.deactivatedAt,
        reason: user.deactivation?.reason,
      });
    }
    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your account.');
    }

    if (!verifyPassword(loginDto.passwordHash, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email?.trim();
    const response = {
      message:
        'If an active account uses that email address, a password reset link has been sent.',
    };

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return response;
    }

    const user = await this.prismaService.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, firstName: true, isActive: true },
    });

    if (!user?.isActive) {
      return response;
    }

    const resetToken = randomBytes(32).toString('hex');
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: this.hashVerificationToken(resetToken),
        passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.sendPasswordResetEmail(user.email, user.firstName, resetToken);
    return response;
  }

  async resetPassword(token: string, passwordHash: string) {
    if (!token || !passwordHash) {
      throw new BadRequestException(
        'A reset token and new password are required.',
      );
    }

    const user = await this.prismaService.user.findFirst({
      where: {
        passwordResetTokenHash: this.hashVerificationToken(token),
        passwordResetExpiresAt: { gt: new Date() },
        isActive: true,
      },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException(
        'This password reset link is invalid or has expired.',
      );
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(passwordHash),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return { changed: true };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('refreshToken is required.');
    }

    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.getRefreshTokenSecret(),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      select: authUserSelect,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.buildAuthResponse(user);
  }

  async me(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with id "${userId}" was not found`);
    }

    return user;
  }

  async getDeactivationStatus(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email: email.trim() },
      select: {
        isActive: true,
        deactivation: { select: { reason: true, deactivatedAt: true } },
      },
    });

    return user && !user.isActive
      ? { deactivated: true, ...user.deactivation }
      : { deactivated: false };
  }

  async updateProfilePicture(
    userId: string,
    file?: { originalname: string; buffer: Buffer; mimetype: string },
  ) {
    if (!file?.buffer || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Upload a valid profile image.');
    }

    const extension = file.originalname.includes('.')
      ? file.originalname
          .slice(file.originalname.lastIndexOf('.'))
          .toLowerCase()
      : '.png';
    const profilePictureUrl = await this.saveProfilePicture(
      file.buffer,
      extension,
    );

    return this.prismaService.user.update({
      where: { id: userId },
      data: { profilePictureUrl },
      select: safeUserSelect,
    });
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Verification token is required.');
    }

    const user = await this.prismaService.user.findFirst({
      where: {
        emailVerificationTokenHash: this.hashVerificationToken(token),
        emailVerificationExpiresAt: { gt: new Date() },
      },
      select: authUserSelect,
    });

    if (!user) {
      throw new BadRequestException(
        'This verification link is invalid or has expired.',
      );
    }

    const verifiedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
      select: authUserSelect,
    });

    return this.buildAuthResponse(verifiedUser);
  }

  getVerificationPageUrl(token: string) {
    return `${this.getWebAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const firstName = updateProfileDto.firstName?.trim();
    const lastName = updateProfileDto.lastName?.trim();
    const hasProfileDetail =
      Object.hasOwn(updateProfileDto, 'bio') ||
      Object.hasOwn(updateProfileDto, 'location') ||
      Object.hasOwn(updateProfileDto, 'latitude') ||
      Object.hasOwn(updateProfileDto, 'longitude');

    if (!firstName && !lastName && !hasProfileDetail) {
      throw new BadRequestException(
        'Provide a first name or last name to update.',
      );
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${userId}" was not found`);
    }

    return this.prismaService.user.update({
      where: { id: userId },
      data: {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        bio: Object.hasOwn(updateProfileDto, 'bio')
          ? updateProfileDto.bio?.trim() || null
          : undefined,
        location: Object.hasOwn(updateProfileDto, 'location')
          ? updateProfileDto.location?.trim() || null
          : undefined,
        latitude: Object.hasOwn(updateProfileDto, 'latitude')
          ? Number.isFinite(updateProfileDto.latitude)
            ? updateProfileDto.latitude
            : null
          : undefined,
        longitude: Object.hasOwn(updateProfileDto, 'longitude')
          ? Number.isFinite(updateProfileDto.longitude)
            ? updateProfileDto.longitude
            : null
          : undefined,
      },
      select: safeUserSelect,
    });
  }

  async changePassword(
    userId: string,
    dto: { currentPasswordHash: string; newPasswordHash: string },
  ) {
    const user = await this.requireCurrentPassword(
      userId,
      dto.currentPasswordHash,
    );

    if (!dto.newPasswordHash) {
      throw new BadRequestException('A new password is required.');
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(dto.newPasswordHash) },
    });

    return { changed: true };
  }

  async changeEmail(
    userId: string,
    dto: { currentPasswordHash: string; email: string },
  ) {
    const user = await this.requireCurrentPassword(
      userId,
      dto.currentPasswordHash,
    );
    const email = dto.email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException('Provide a valid email address.');
    }

    const verificationToken = randomBytes(32).toString('hex');
    try {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          email,
          isVerified: false,
          emailVerificationTokenHash:
            this.hashVerificationToken(verificationToken),
          emailVerificationExpiresAt: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ),
        },
      });
    } catch (error) {
      if (this.isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('A user with this email already exists.');
      }
      throw error;
    }

    await this.sendVerificationEmail(email, user.firstName, verificationToken);
    return { verificationRequired: true };
  }

  async changePhoneNumber(userId: string, dto: { phoneNumber?: string }) {
    const phoneNumber = this.normalizePhoneNumber(dto.phoneNumber);

    return this.prismaService.user.update({
      where: { id: userId },
      data: { phoneNumber: phoneNumber || null },
      select: safeUserSelect,
    });
  }

  async deleteAccount(userId: string, dto: { currentPasswordHash: string }) {
    const user = await this.requireCurrentPassword(
      userId,
      dto.currentPasswordHash,
    );
    await this.prismaService.user.delete({ where: { id: user.id } });
    return { deleted: true };
  }

  private async findUserByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email },
      select: authUserSelect,
    });
  }

  private normalizePhoneNumber(phoneNumber?: string) {
    const normalizedPhoneNumber = phoneNumber?.trim();
    if (
      normalizedPhoneNumber &&
      !/^[+()\d\s-]{6,30}$/.test(normalizedPhoneNumber)
    ) {
      throw new BadRequestException('Provide a valid phone number.');
    }
    return normalizedPhoneNumber || null;
  }

  private async saveProfilePicture(buffer: Buffer, extension: string) {
    const filename = `${randomUUID()}${extension}`;
    const directory = resolve(process.cwd(), 'uploads', 'profiles');
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, filename), buffer);
    return `/uploads/profiles/${filename}`;
  }

  private async requireCurrentPassword(userId: string, passwordHash: string) {
    if (!passwordHash) {
      throw new BadRequestException('Your current password is required.');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: authUserSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with id "${userId}" was not found`);
    }

    if (!verifyPassword(passwordHash, user.passwordHash)) {
      throw new UnauthorizedException('Your current password is incorrect.');
    }

    return user;
  }

  private hashVerificationToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sendVerificationEmail(
    email: string,
    firstName: string,
    token: string,
  ) {
    const verificationUrl = `${this.getWebAppUrl()}/verify-email?token=${token}`;
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const from = this.configService.get<string>('RESEND_FROM');

    if (!apiKey || !from) {
      this.logger.warn(
        `Email verification URL for ${email}: ${verificationUrl}`,
      );
      return;
    }

    try {
      const resend = new Resend(apiKey);
      const logoContent = await readFile(
        resolve(process.cwd(), '..', 'web', 'public', 'images', 'logo.png'),
      );
      const { error } = await resend.emails.send({
        from,
        to: 'gibonakos196@gmail.com',
        subject: 'Verify your Floofs account',
        html: this.buildVerificationEmailHtml(firstName, verificationUrl),
        attachments: [
          {
            content: logoContent.toString('base64'),
            filename: 'logo.png',
            contentId: 'floofs-logo',
          },
        ],
      });

      if (error) {
        this.logger.error(
          `Could not send verification email: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Could not send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async sendPasswordResetEmail(
    email: string,
    firstName: string,
    token: string,
  ) {
    const passwordResetUrl = `${this.getWebAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const from = this.configService.get<string>('RESEND_FROM');

    if (!apiKey || !from) {
      this.logger.warn(`Password reset URL for ${email}: ${passwordResetUrl}`);
      return;
    }

    try {
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from,
        to: email,
        subject: 'Reset your Floofs password',
        html: this.buildPasswordResetEmailHtml(firstName, passwordResetUrl),
      });

      if (error) {
        this.logger.error(
          `Could not send password reset email: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Could not send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private getWebAppUrl() {
    const configuredUrl = this.configService.get<string>('WEB_APP_URL');
    if (!configuredUrl) return 'https://192.168.0.100:5173';

    try {
      const url = new URL(configuredUrl);
      if (url.port === '3000' || url.pathname.startsWith('/api')) {
        url.port = '5173';
        url.pathname = '';
        url.search = '';
      }
      return url.origin;
    } catch {
      return 'https://192.168.0.100:5173';
    }
  }

  private buildVerificationEmailHtml(
    firstName: string,
    verificationUrl: string,
  ) {
    const escapeHtml = (value: string) =>
      value.replace(
        /[&<>'"]/g,
        (character) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
          })[character] ?? character,
      );
    const safeName = escapeHtml(firstName.trim() || 'there');
    const safeUrl = escapeHtml(verificationUrl);
    const dataSafetyUrl = escapeHtml(`${this.getWebAppUrl()}/data-safety`);

    return `<!doctype html><html lang="en"><body style="margin:0;background:#ffffff;color:#231f20;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #f0dce5"><tr><td style="padding:28px 36px;background:#fec8e9"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="76" valign="middle"><img src="cid:floofs-logo" width="60" height="60" alt="Floofs" style="display:block;width:60px;height:60px;object-fit:contain" /></td><td valign="middle"><p style="margin:0;font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Floofs</p><h1 style="margin:8px 0 0;font-size:32px;line-height:1.15">Welcome to Floofs!</h1></td></tr></table></td></tr><tr><td style="padding:32px 36px"><p style="margin:0 0 16px;font-size:16px;line-height:1.6">Hello ${safeName},</p><p style="margin:0 0 24px;font-size:16px;line-height:1.6">Your Floofs account is ready. Confirm your email address to start discovering pets and connecting with their carers.</p><p style="margin:0 0 28px"><a href="${safeUrl}" style="display:inline-block;background:#231f20;color:#ffffff;padding:14px 22px;text-decoration:none;font-weight:700">Verify email address</a></p><p style="margin:0;font-size:14px;line-height:1.6;color:#62595d">This link expires in 24 hours. If you did not create a Floofs account, you can safely ignore this email.</p></td></tr><tr><td style="padding:22px 36px;background:#fff8f2;border-top:1px solid #f0dce5"><p style="margin:0 0 8px;font-size:13px;color:#62595d">Your privacy and account security matter to us.</p><a href="${dataSafetyUrl}" style="font-size:13px;color:#8d245f">Read our Data Safety policy</a></td></tr></table></td></tr></table></body></html>`;
  }

  private buildPasswordResetEmailHtml(
    firstName: string,
    passwordResetUrl: string,
  ) {
    const escapeHtml = (value: string) =>
      value.replace(
        /[&<>'"]/g,
        (character) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
          })[character] ?? character,
      );
    const safeName = escapeHtml(firstName.trim() || 'there');
    const safeUrl = escapeHtml(passwordResetUrl);

    return `<!doctype html><html lang="en"><body style="margin:0;background:#ffffff;color:#231f20;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #f0dce5"><tr><td style="padding:28px 36px;background:#fec8e9"><p style="margin:0;font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Floofs</p><h1 style="margin:8px 0 0;font-size:32px;line-height:1.15">Reset your password</h1></td></tr><tr><td style="padding:32px 36px"><p style="margin:0 0 16px;font-size:16px;line-height:1.6">Hello ${safeName},</p><p style="margin:0 0 24px;font-size:16px;line-height:1.6">Use the link below to choose a new password for your Floofs account.</p><p style="margin:0 0 28px"><a href="${safeUrl}" style="display:inline-block;background:#231f20;color:#ffffff;padding:14px 22px;text-decoration:none;font-weight:700">Reset password</a></p><p style="margin:0;font-size:14px;line-height:1.6;color:#62595d">This link expires in one hour and can be used once. If you did not request it, you can safely ignore this email.</p></td></tr></table></td></tr></table></body></html>`;
  }

  private buildAuthResponse(user: AuthUser) {
    return {
      accessToken: this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        } satisfies AuthTokenPayload,
        {
          jwtid: randomUUID(),
        },
      ),
      refreshToken: this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          tokenType: 'refresh',
        } satisfies RefreshTokenPayload,
        {
          secret: this.getRefreshTokenSecret(),
          expiresIn: this.getRefreshTokenExpiresIn(),
          jwtid: randomUUID(),
        },
      ),
      user: this.toSafeUser(user),
    };
  }

  private getRefreshTokenSecret() {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      'floofs-dev-refresh-secret'
    );
  }

  private getRefreshTokenExpiresIn() {
    return (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
      '7d') as any;
  }

  private toSafeUser(user: AuthUser): SafeUser {
    const { passwordHash: _passwordHash, ...safeUser } = user;

    return safeUser;
  }

  private resolveRole(accountType?: 'user' | 'shelter') {
    if (accountType === 'shelter') {
      return UserRole.SHELTER;
    }

    return UserRole.USER;
  }

  private isPrismaUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private logRegisterError(error: unknown, registerDto: RegisterDto) {
    const details =
      error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
        : JSON.stringify(error);

    this.logger.error(`Register failed for ${registerDto.email}`, details);
  }
}

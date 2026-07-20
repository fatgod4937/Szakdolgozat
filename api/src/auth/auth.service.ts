import {
  ConflictException,
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
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
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
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
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

      const user = await this.prismaService.user.create({
        data: {
          email: registerDto.email,
          passwordHash: hashPassword(registerDto.passwordHash),
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          role,
        },
        select: authUserSelect,
      });

      return this.buildAuthResponse(user);
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

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!verifyPassword(loginDto.passwordHash, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
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

  private async findUserByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email },
      select: authUserSelect,
    });
  }

  private buildAuthResponse(user: AuthUser) {
    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      } satisfies AuthTokenPayload),
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

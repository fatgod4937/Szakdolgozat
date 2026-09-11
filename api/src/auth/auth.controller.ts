import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, type Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  PasswordResetDto,
  PasswordResetRequestDto,
} from './dto/password-reset.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  ChangeEmailDto,
  ChangePasswordDto,
  ChangePhoneNumberDto,
  DeleteAccountDto,
} from './dto/account-settings.dto';
import { JwtAuthGuard, JwtAuthUser } from './jwt-auth.guard';

type JwtRequest = Request & {
  user?: JwtAuthUser;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: PasswordResetDto) {
    return this.authService.resetPassword(dto.token, dto.passwordHash);
  }

  @Get('deactivation-status')
  getDeactivationStatus(@Query('email') email = '') {
    return this.authService.getDeactivationStatus(email);
  }

  @Post('refresh')
  refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Get('verify-email')
  verifyEmail(
    @Query('token') token = '',
    @Req() request: JwtRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (request.headers.accept?.includes('text/html')) {
      response.redirect(302, this.authService.getVerificationPageUrl(token));
      return;
    }
    return this.authService.verifyEmail(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: JwtRequest) {
    return this.authService.me(request.user?.sub ?? '');
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  updateMe(
    @Req() request: JwtRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(
      request.user?.sub ?? '',
      updateProfileDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/profile-picture')
  @UseInterceptors(FileInterceptor('profilePicture'))
  updateProfilePicture(
    @Req() request: JwtRequest,
    @UploadedFile()
    file?: { originalname: string; buffer: Buffer; mimetype: string },
  ) {
    return this.authService.updateProfilePicture(request.user?.sub ?? '', file);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/password')
  changePassword(@Req() request: JwtRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(request.user?.sub ?? '', dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/email')
  changeEmail(@Req() request: JwtRequest, @Body() dto: ChangeEmailDto) {
    return this.authService.changeEmail(request.user?.sub ?? '', dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/phone-number')
  changePhoneNumber(
    @Req() request: JwtRequest,
    @Body() dto: ChangePhoneNumberDto,
  ) {
    return this.authService.changePhoneNumber(request.user?.sub ?? '', dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/delete')
  deleteAccount(@Req() request: JwtRequest, @Body() dto: DeleteAccountDto) {
    return this.authService.deleteAccount(request.user?.sub ?? '', dto);
  }
}

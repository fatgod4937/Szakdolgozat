import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { IdentityVerificationGuard } from '../auth/identity-verification.guard';
import { JwtAuthGuard, JwtAuthUser } from '../auth/jwt-auth.guard';
import { ProfilesService } from './profiles.service';

type JwtRequest = Request & { user?: JwtAuthUser };

@Controller('profiles')
@UseGuards(JwtAuthGuard, IdentityVerificationGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('users/:id')
  getUserProfile(@Param('id') id: string) {
    return this.profilesService.getUserProfile(id);
  }

  @Get('shelters/:id')
  getShelterProfile(@Param('id') id: string) {
    return this.profilesService.getShelterProfile(id);
  }

  @Get(':targetType/:targetId/comments')
  listComments(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ) {
    return this.profilesService.listComments(targetType, targetId);
  }

  @Post(':targetType/:targetId/comments')
  createComment(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @Body('content') content: string,
    @Body('parentId') parentId: string | undefined,
    @Req() request: JwtRequest,
  ) {
    return this.profilesService.createComment(
      targetType,
      targetId,
      request.user?.sub ?? '',
      content,
      parentId,
    );
  }

  @Post('comments/:id/dispute')
  disputeComment(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() request: JwtRequest,
  ) {
    return this.profilesService.disputeComment(
      id,
      request.user?.sub ?? '',
      reason,
    );
  }
}

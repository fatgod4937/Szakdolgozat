import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthService } from '../auth/auth.service';
import type { Request } from 'express';
import { getEmailLanguage } from '../auth/utils/email-language.util';
import { SheltersService } from './shelters.service';

type RegistrationBody = {
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  acceptDataSafety?: string | boolean;
  name?: string;
  description?: string;
  city?: string;
  contactEmail?: string;
  websiteUrl?: string;
};

// Public endpoint: creates the shelter account and its review application in one request.
@Controller('shelter-registrations')
export class ShelterRegistrationController {
  constructor(
    private readonly authService: AuthService,
    private readonly sheltersService: SheltersService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('documents', 5))
  async register(
    @Body() body: RegistrationBody,
    @Req() request: Request,
    @UploadedFiles()
    files: Array<{
      originalname: string;
      buffer: Buffer;
      mimetype: string;
    }> = [],
  ) {
    if (!body.email || !body.firstName || !body.lastName) {
      throw new BadRequestException('Name and email are required.');
    }

    // Validate everything about the application before creating the account.
    this.sheltersService.assertValidDocuments(files);
    this.sheltersService.assertApplicationDetails(body);

    const { message, userId } = await this.authService.registerAccount(
      {
        email: body.email,
        password: '',
        passwordHash: body.passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber,
        acceptDataSafety:
          body.acceptDataSafety === true || body.acceptDataSafety === 'true',
        accountType: 'shelter',
      },
      getEmailLanguage(request),
    );

    await this.sheltersService.submitApplication(userId, body, files);

    return { message };
  }
}

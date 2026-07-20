import { UserRole } from '@prisma/client';

export type PublicUserRole = 'USER' | 'SHELTER';

export class RegisterDto {
  email: string;
  password: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  accountType?: 'user' | 'shelter';
  role?: PublicUserRole;
  shelterName?: string;
}

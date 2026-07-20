import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

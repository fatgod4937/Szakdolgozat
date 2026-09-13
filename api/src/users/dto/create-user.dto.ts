import { UserRole } from '@prisma/client';

export class CreateUserDto {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  isActive?: boolean;
}

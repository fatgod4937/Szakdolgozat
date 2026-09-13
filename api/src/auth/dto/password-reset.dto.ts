export class PasswordResetRequestDto {
  email: string;
}

export class PasswordResetDto {
  token: string;
  passwordHash: string;
}

export class ChangePasswordDto {
  currentPasswordHash: string;
  newPasswordHash: string;
}

export class ChangeEmailDto {
  currentPasswordHash: string;
  email: string;
}

export class ChangePhoneNumberDto {
  phoneNumber?: string;
}

export class DeleteAccountDto {
  currentPasswordHash: string;
}

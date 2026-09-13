import { getJson, postFormData, postJson } from "./api";

export type LoginRequest = {
  email: string;
  passwordHash: string;
};

export type RegisterRequest = {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  acceptDataSafety: boolean;
};

export type AuthResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: { email?: string };
  message?: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  role: "USER" | "ADMIN" | "SHELTER";
  isActive: boolean;
  isVerified: boolean;
  profilePictureUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type RefreshRequest = {
  refreshToken: string;
};

let refreshSessionPromise: Promise<AuthResponse> | null = null;

export function login(request: LoginRequest) {
  return postJson<AuthResponse>("/auth/login", request);
}

export function register(request: RegisterRequest) {
  return postJson<AuthResponse>("/auth/register", request);
}

export function requestPasswordReset(email: string) {
  return postJson<AuthResponse>("/auth/forgot-password", { email });
}

export function resetPassword(request: {
  token: string;
  passwordHash: string;
}) {
  return postJson<{ changed: boolean }>("/auth/reset-password", request);
}

export function refresh(request: RefreshRequest) {
  if (!refreshSessionPromise) {
    refreshSessionPromise = postJson<AuthResponse>(
      "/auth/refresh",
      request,
    ).finally(() => {
      refreshSessionPromise = null;
    });
  }

  return refreshSessionPromise;
}

export function getCurrentUser() {
  return getJson<CurrentUser>("/auth/me");
}

export function updateCurrentUser(
  request: Partial<
    Pick<
      CurrentUser,
      "firstName" | "lastName" | "bio" | "location" | "latitude" | "longitude"
    >
  >,
) {
  return postJson<CurrentUser>("/auth/me", request, true);
}

export function updateProfilePicture(profilePicture: File) {
  const formData = new FormData();
  formData.append("profilePicture", profilePicture);
  return postFormData<CurrentUser>("/auth/me/profile-picture", formData);
}

export function verifyEmail(token: string) {
  return getJson<AuthResponse>(
    `/auth/verify-email?token=${encodeURIComponent(token)}`,
    false,
  );
}

export function changePassword(request: {
  currentPasswordHash: string;
  newPasswordHash: string;
}) {
  return postJson<{ changed: boolean }>("/auth/me/password", request, true);
}

export function changeEmail(request: {
  currentPasswordHash: string;
  email: string;
}) {
  return postJson<{ verificationRequired: boolean }>(
    "/auth/me/email",
    request,
    true,
  );
}

export function changePhoneNumber(phoneNumber: string) {
  return postJson<CurrentUser>("/auth/me/phone-number", { phoneNumber }, true);
}

export function deleteCurrentAccount(currentPasswordHash: string) {
  return postJson<{ deleted: boolean }>(
    "/auth/me/delete",
    { currentPasswordHash },
    true,
  );
}

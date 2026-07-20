import { postJson } from "./api";

export type LoginRequest = {
  email: string;
  passwordHash: string;
};

export type RegisterRequest = {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
};

export type AuthResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: { email?: string };
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

export type AppRole = "USER" | "ADMIN" | "OPERATOR" | "MERCHANT";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AppRole;
}

export interface JwtSessionPayload {
  sub: string;
  email: string;
  role: AppRole;
  type: "access";
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

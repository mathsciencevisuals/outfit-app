import { parseAdminEnv } from "@fitme/config";

export const env = parseAdminEnv({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
});

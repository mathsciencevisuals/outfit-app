import { parseAdminEnv } from "@fitme/config";

export const env = parseAdminEnv({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "https://fitme-api-237152691367.asia-south1.run.app"
});

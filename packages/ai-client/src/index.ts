import { HttpTryOnProvider } from "./providers/http.provider";
import { MockTryOnProvider } from "./providers/mock.provider";
import { TryOnProvider } from "./interfaces/tryon-provider";

export * from "./interfaces/tryon-provider";
export * from "./providers/http.provider";
export * from "./providers/mock.provider";

export const createTryOnProvider = (provider: "mock" | "http", baseUrl: string): TryOnProvider => {
  if (provider === "http") {
    return new HttpTryOnProvider(baseUrl);
  }

  return new MockTryOnProvider();
};

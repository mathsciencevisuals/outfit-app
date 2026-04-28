import { HttpTryOnProvider } from "./providers/http.provider";
import { MockTryOnProvider } from "./providers/mock.provider";
import { GrokTryOnProvider } from "./providers/grok.provider";
import { TryOnProvider } from "./interfaces/tryon-provider";

export * from "./interfaces/tryon-provider";
export * from "./providers/http.provider";
export * from "./providers/mock.provider";
export * from "./providers/grok.provider";

export const createTryOnProvider = (
  provider: "mock" | "http" | "grok",
  baseUrl: string,
  apiKey?: string,
  grokUsePro = false
): TryOnProvider => {
  if (provider === "grok") {
    if (!apiKey) throw new Error("GROK_API_KEY is required for the Grok provider");
    return new GrokTryOnProvider(apiKey, grokUsePro);
  }
  if (provider === "http") {
    return new HttpTryOnProvider(baseUrl);
  }
  return new MockTryOnProvider();
};

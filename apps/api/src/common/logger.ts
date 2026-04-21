import { LoggerOptions } from "pino";

export const pinoLoggerConfig: LoggerOptions = {
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            singleLine: true,
            colorize: true
          }
        }
      : undefined
};

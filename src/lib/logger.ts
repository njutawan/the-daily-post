import pino from "pino";
import { LOG_LEVEL } from "@/lib/env";

/**
 * Structured logger using pino.
 * In production: JSON output to stdout (parseable by log aggregators).
 * In development: human-readable pretty output.
 */
const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: LOG_LEVEL,
  ...(isProduction
    ? {
        // Production: JSON logs
        formatters: {
          level: (label) => ({ level: label }),
        },
      }
    : {
        // Development: pretty print
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
      }),
});

export default logger;

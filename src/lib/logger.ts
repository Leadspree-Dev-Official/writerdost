import pino from "pino";

export const REDACTED_PATHS = [
  "apiKey",
  "*.apiKey",
  "*.*.apiKey",
  "authorization",
  "*.authorization",
  "*.*.authorization",
  "cookie",
  "*.cookie",
  "*.*.cookie",
  "secret",
  "*.secret",
  "*.*.secret",
  "token",
  "*.token",
  "*.*.token",
  "password",
  "*.password",
  "*.*.password",
  "headers.authorization",
  "headers.cookie",
  "secretCipher",
  "aiSecretCipher",
  "prompt",
  "*.prompt",
  "manuscript",
  "*.manuscript",
  "rawErrorBody",
  "*.rawErrorBody",
];

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  redact: {
    paths: REDACTED_PATHS,
    censor: "[REDACTED]",
  },
  base: {
    env: process.env.NODE_ENV || "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;

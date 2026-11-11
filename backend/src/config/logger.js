import winston from "winston";

const { combine, timestamp, printf, errors, colorize, json } = winston.format;

// Consistent log format for development (human readable) and production (JSON).
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    process.env.NODE_ENV === "production" ? json() : colorize({ all: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ["error"],
    }),
  ],
});

// Stream for HTTP loggers (e.g. morgan) if added later.
logger.stream = {
  write: (message) => logger.debug(message.trim()),
};

export default logger;

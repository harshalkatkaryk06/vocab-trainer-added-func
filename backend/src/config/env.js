/**
 * Validates required environment variables at startup.
 * Fails fast with clear messages if any required variable is missing or invalid.
 * Never logs secret values.
 */

const requiredString = (name) => {
  const value = process.env[name];
  if (!value || value.includes("your_") || value.includes("_here")) {
    throw new Error(
      `Missing or placeholder environment variable: ${name}. Set it in .env (see .env.example).`
    );
  }
  return value;
};

const optionalString = (name, fallback = "") => {
  return process.env[name] || fallback;
};

const validateEnv = () => {
  const errors = [];

  // Required secrets / config (must be real values, not placeholders).
  const required = [
    "MONGO_URI",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "GOOGLE_CLIENT_ID",
    "OPENAI_API_KEY",
    "BREVO_API_KEY",
    "BREVO_SENDER_EMAIL",
    "CLIENT_URL",
  ];

  for (const name of required) {
    try {
      requiredString(name);
    } catch (err) {
      errors.push(err.message);
    }
  }

  // Validate MongoDB URI shape.
  const mongoUri = process.env.MONGO_URI;
  if (
    mongoUri &&
    !mongoUri.startsWith("mongodb://") &&
    !mongoUri.startsWith("mongodb+srv://")
  ) {
    errors.push(
      "MONGO_URI must start with 'mongodb://' or 'mongodb+srv://'"
    );
  }

  // Validate CORS origins are set.
  if (!process.env.CLIENT_URL) {
    errors.push("CLIENT_URL is required");
  }

  if (errors.length > 0) {
    console.error("\n❌ Environment validation failed:");
    errors.forEach((e) => console.error(`   - ${e}`));
    console.error("   See .env.example for required values.\n");
    process.exit(1);
  }

  return {
    NODE_ENV: optionalString("NODE_ENV", "development"),
    PORT: optionalString("PORT", "4000"),
    MONGO_URI: process.env.MONGO_URI,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    ACCESS_TOKEN_EXPIRY: optionalString("ACCESS_TOKEN_EXPIRY", "15m"),
    REFRESH_TOKEN_EXPIRY: optionalString("REFRESH_TOKEN_EXPIRY", "7d"),
    REFRESH_COOKIE_NAME: optionalString("REFRESH_COOKIE_NAME", "refreshToken"),
    BCRYPT_SALT_ROUNDS: optionalString("BCRYPT_SALT_ROUNDS", "12"),
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_URL: process.env.CLIENT_URL,
    PROD_CLIENT_URL: optionalString("PROD_CLIENT_URL"),
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: optionalString("BREVO_SENDER_NAME", "VocabTrainer"),
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    UNLIMITED_EMAILS: optionalString(
      "UNLIMITED_EMAILS",
      "harshalkatkar76@gmail.com"
    ),
    SUPER_ADMIN_EMAIL: optionalString(
      "SUPER_ADMIN_EMAIL",
      "harshalkatkar76@gmail.com"
    ),
    LOG_LEVEL: optionalString("LOG_LEVEL"),
  };
};

export { validateEnv };

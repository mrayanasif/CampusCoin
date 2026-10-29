// Central JWT configuration.
//
// Development may run without JWT_SECRET (insecure fallback) so existing local
// workflows keep working, but production must fail loudly instead of silently
// signing tokens with a well-known secret.
const DEV_FALLBACK_SECRET = "secret123";
const DEFAULT_EXPIRE = "7d";

let warnedAboutFallback = false;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (typeof secret === "string" && secret.trim().length > 0) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is required in production. Refusing to start with the insecure development fallback secret."
    );
  }

  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      "⚠️  JWT_SECRET is not set. Using the insecure development fallback secret; set JWT_SECRET before deploying."
    );
  }

  return DEV_FALLBACK_SECRET;
}

function getJwtExpire() {
  return process.env.JWT_EXPIRE || DEFAULT_EXPIRE;
}

module.exports = { getJwtExpire, getJwtSecret };

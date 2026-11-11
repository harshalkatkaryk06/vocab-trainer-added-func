/**
 * NoSQL injection protection (Express 5 compatible).
 *
 * Removes MongoDB query operator keys (keys starting with "$") from user input
 * so they cannot be injected into Mongoose queries (e.g. $gt, $ne, $regex, $where).
 *
 * req.body is deep-sanitized. req.query and req.params are shallow-sanitized by
 * deleting top-level "$" keys (Express 5 exposes them as getter-only, so they
 * cannot be reassigned wholesale).
 */

const MONGO_OPERATOR_PREFIX = "$";

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const sanitize = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (isPlainObject(value)) {
    const cleaned = {};
    for (const [key, val] of Object.entries(value)) {
      if (String(key).startsWith(MONGO_OPERATOR_PREFIX)) {
        continue;
      }
      cleaned[key] = sanitize(val);
    }
    return cleaned;
  }

  return value;
};

const stripOperatorKeys = (obj) => {
  if (!isPlainObject(obj)) return;
  for (const key of Object.keys(obj)) {
    if (String(key).startsWith(MONGO_OPERATOR_PREFIX)) {
      delete obj[key];
    }
  }
};

const mongoSanitize = (req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  stripOperatorKeys(req.query);
  stripOperatorKeys(req.params);
  next();
};

export default mongoSanitize;

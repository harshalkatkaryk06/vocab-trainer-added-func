import crypto from "crypto";

const generateSessionId = () => {
  return crypto.randomUUID();
};

export default generateSessionId;
// utils/crypto.ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

/**
 * Hash a token or password using bcrypt.
 * Returns a string that can be stored safely.
 */
export const hashSecret = async (secret: string): Promise<string> => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hash = await bcrypt.hash(secret, salt);
  return hash;
};

/**
 * Verify a token or password against a stored bcrypt hash.
 */
export const verifySecret = async (secret: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(secret, hash);
};

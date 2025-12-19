import crypto from "crypto";
import { customType } from "drizzle-orm/pg-core";
import { env } from "@/env.mjs";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard IV length
const TAG_LENGTH = 16; // GCM standard tag length

/**
 * Get the encryption key from environment, ensuring it's the right length
 */
function getKey(): Buffer {
  const key = env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // If the key is hex-encoded (64 chars = 32 bytes), decode it
  if (key.length === 64) {
    return Buffer.from(key, "hex");
  }
  // Otherwise, hash it to get a consistent 32-byte key
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns format: "iv:tag:encrypted" (all base64 encoded)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted (all base64)
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt a string that was encrypted with encrypt()
 * Expects format: "iv:tag:encrypted" (all base64 encoded)
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;

  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }

  const [ivBase64, tagBase64, encrypted] = parts as [string, string, string];
  const key = getKey();
  const iv = Buffer.from(ivBase64, "base64");
  const tag = Buffer.from(tagBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if a string is already in encrypted format
 * Encrypted strings have the format: "iv:tag:encrypted" (3 parts separated by colons)
 */
export function isAlreadyEncrypted(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const parts = value.split(":");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Custom Drizzle type for encrypted text fields
 * Automatically encrypts on write and decrypts on read
 */
export const encryptedText = customType<{ data: string; driverData: string }>({
  dataType: () => "text",
  fromDriver: (value: string) => {
    if (!value) return value;
    try {
      return decrypt(value);
    } catch (error) {
      console.error("Error decrypting value from database:", error);
      return value;
    }
  },
  toDriver: (value: string) => {
    if (!value) return value;
    // Prevent double encryption
    if (isAlreadyEncrypted(value)) {
      return value;
    }
    return encrypt(value);
  },
});

/**
 * Get the prefix of an API key for display purposes
 * e.g., "sk-ant-api03-..." -> "sk-ant-..."
 */
export function getApiKeyPrefix(apiKey: string): string {
  if (!apiKey) return "";
  // Show first 7 chars + "..." for display
  if (apiKey.length <= 10) return apiKey.substring(0, 4) + "...";
  return apiKey.substring(0, 7) + "...";
}

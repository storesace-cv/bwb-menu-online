/**
 * Server-only: encrypt/decrypt secrets per store (e.g. NET-BO password, api_token).
 * Uses AES-256-GCM with key derived from ENCRYPTION_MASTER_KEY + storeId.
 * Never import this module in client code.
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "crypto";

const ALG = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;
const SALT_PREFIX = "bwb-store:";
const ITERATIONS = 100000;

function getMasterKey(): Buffer {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_MASTER_KEY must be set and at least 32 characters");
  }
  return Buffer.from(key, "utf8");
}

function deriveKey(storeId: string): Buffer {
  const master = getMasterKey();
  const salt = Buffer.from(SALT_PREFIX + storeId, "utf8");
  return pbkdf2Sync(master, salt, ITERATIONS, KEY_LEN, "sha256");
}

/**
 * Encrypt plaintext for the given store. Returns base64 string (iv + ciphertext + tag).
 */
export function encryptSecret(plaintext: string, storeId: string): string {
  const key = deriveKey(storeId);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString("base64");
}

/**
 * Decrypt ciphertext (base64: iv + ciphertext + tag) for the given store.
 */
export function decryptSecret(ciphertext: string, storeId: string): string {
  const key = deriveKey(storeId);
  const buf = Buffer.from(ciphertext, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("Invalid ciphertext");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const enc = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final("utf8");
}

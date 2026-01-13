// src/utils/memoEncryption.js

import CryptoJS from 'crypto-js';

/**
 * Encrypt a burn payload using AES-256-CBC with IV.
 *
 * Backend expects memo format:
 *   ENC:<ivBase64>:<cipherBase64>
 *
 * Payload example:
 * {
 *   type: "burn",
 *   user: "maestrobeatz",
 *   assetId: "1099816627929",
 *   incineratorId: "1099950016411",
 *   ts: 1733700000
 * }
 */
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY;

export function encryptBurnPayload(payload) {
  if (!ENCRYPTION_KEY) {
    throw new Error('REACT_APP_ENCRYPTION_KEY is not set in the frontend environment');
  }

  const plaintext = JSON.stringify(payload);

  // Key + IV as WordArrays
  const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
  const iv = CryptoJS.lib.WordArray.random(16); // 128-bit IV

  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const ivBase64 = CryptoJS.enc.Base64.stringify(iv);
  const cipherBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);

  // This matches the backend's expected format in memoEncryption.js
  return `ENC:${ivBase64}:${cipherBase64}`;
}

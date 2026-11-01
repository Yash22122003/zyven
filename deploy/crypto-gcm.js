#!/usr/bin/env node
// ==============================================================================
// Authenticated Encryption & Decryption Utility (AES-256-GCM with Scrypt KDF)
// ==============================================================================
const crypto = require('crypto');
const fs = require('fs');

const mode = process.argv[2];
const inputFile = process.argv[3];
const outputFile = process.argv[4];
const password = process.env.BACKUP_ENCRYPTION_KEY;

if (!['encrypt', 'decrypt'].includes(mode) || !inputFile || !outputFile || !password) {
  console.error('Usage: BACKUP_ENCRYPTION_KEY=<key> node crypto-gcm.js <encrypt|decrypt> <inputFile> <outputFile>');
  process.exit(1);
}

try {
  if (mode === 'encrypt') {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const data = fs.readFileSync(inputFile);
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag(); // 16 bytes

    // File Format: [16 bytes Salt] [12 bytes IV] [16 bytes Auth Tag] [Ciphertext...]
    const finalPayload = Buffer.concat([salt, iv, authTag, ciphertext]);
    fs.writeFileSync(outputFile, finalPayload);
    console.log(`Successfully encrypted ${inputFile} -> ${outputFile} (AES-256-GCM authenticated)`);
  } else if (mode === 'decrypt') {
    const payload = fs.readFileSync(inputFile);
    if (payload.length < 44) {
      throw new Error('Encrypted payload too short (minimum 44 bytes required for headers)');
    }

    const salt = payload.subarray(0, 16);
    const iv = payload.subarray(16, 28);
    const authTag = payload.subarray(28, 44);
    const ciphertext = payload.subarray(44);

    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    fs.writeFileSync(outputFile, plaintext);
    console.log(`Successfully decrypted and verified ${inputFile} -> ${outputFile}`);
  }
} catch (err) {
  console.error('Cryptographic Operation Failed:', err.message);
  process.exit(1);
}

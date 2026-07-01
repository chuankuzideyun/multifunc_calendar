import { encrypt, decrypt } from '../services/crypto';

// Setup mock keys if they aren't loaded yet (for testing standalone)
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
}

function runTest() {
  console.log('--- Testing Cryptography AES-256-GCM ---');
  const token = 'sample_google_refresh_token_xyz_123456789_abcdef';
  console.log('Original Token:', token);

  try {
    const encrypted = encrypt(token);
    console.log('Encrypted Data:', encrypted);

    const decrypted = decrypt(encrypted);
    console.log('Decrypted Token:', decrypted);

    if (decrypted === token) {
      console.log('STATUS: SUCCESS! Decrypted value matches the original.');
    } else {
      console.log('STATUS: FAILED! Decrypted value does not match.');
    }
  } catch (error) {
    console.error('Crypto test error:', error);
  }
}

runTest();

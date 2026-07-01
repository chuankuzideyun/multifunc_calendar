import { encrypt, decrypt } from '../services/crypto';

if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
}

function runCryptoTests() {
  console.log('[Test] Running crypto.test.ts...');

  const inputs = [
    'short-token-123',
    'yaoxuemeng-google-refresh-token-value-with-special-characters!@#$^*()_-+=',
    '{"access_token":"abc","refresh_token":"def"}',
    'a', // single character
    '' // empty string
  ];

  for (const original of inputs) {
    try {
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      if (decrypted !== original) {
        console.error(`❌ [Test Failure] Decrypted value does not match. Expected "${original}", got "${decrypted}"`);
        process.exit(1);
      }
      
      // Ensure the encrypted format is "ivHex:authTagHex:ciphertextHex"
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        console.error(`❌ [Test Failure] Encrypted value format is incorrect. Got: "${encrypted}"`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ [Test Failure] Cryptography threw an error for input "${original}":`, error);
      process.exit(1);
    }
  }

  console.log('✅ [Test Success] crypto.test.ts completed. All round-trip assertions passed.');
}

runCryptoTests();

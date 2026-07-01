import { execSync } from 'child_process';
import path from 'path';

function runTestScript(scriptName: string) {
  console.log(`\n==================================================`);
  console.log(`[Test Runner] Running: ${scriptName}`);
  console.log(`==================================================`);
  
  try {
    const scriptPath = path.join(__dirname, scriptName);
    execSync(`npx tsx "${scriptPath}"`, { stdio: 'inherit' });
    console.log(`🎉 [Test Success] ${scriptName} passed.`);
  } catch (error) {
    console.error(`❌ [Test Failure] ${scriptName} failed.`);
    process.exit(1);
  }
}

function main() {
  console.log('🚀 Starting Personal Schedule Assistant verification tests...');
  
  // 1. Run local deterministic tests (does not require external network keys)
  runTestScript('crypto.test.ts');
  runTestScript('weather-logic.test.ts');
  
  // 2. Run Gemini parser test (will check for API key presence first)
  runTestScript('gemini-parser.test.ts');
  
  console.log('\n==================================================');
  console.log('✅ ALL AUTOMATED VERIFICATION SUITES PASSED!');
  console.log('==================================================\n');
}

main();

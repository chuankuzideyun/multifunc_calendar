"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
function runTestScript(scriptName) {
    console.log(`\n==================================================`);
    console.log(`[Test Runner] Running: ${scriptName}`);
    console.log(`==================================================`);
    try {
        const scriptPath = path_1.default.join(__dirname, scriptName);
        (0, child_process_1.execSync)(`npx tsx "${scriptPath}"`, { stdio: 'inherit' });
        console.log(`🎉 [Test Success] ${scriptName} passed.`);
    }
    catch (error) {
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

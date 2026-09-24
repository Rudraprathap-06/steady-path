import { runAllTests } from './testRunner.js';

console.log('Running test suite via Node.js...\n');
const result = runAllTests(console.log);

if (result.failed > 0) {
    console.error(`\n❌ ${result.failed} test(s) failed.`);
    process.exit(1);
} else {
    console.log(`\n🎉 All ${result.passed} test(s) passed successfully!`);
    process.exit(0);
}

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the current directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the built test-auth-live script in the core package
const scriptPath = join(__dirname, '../../core/dist/scripts/test-auth-live');

try {
  console.log('🚀 Running GitHub Auth Test from Alfred...\n');

  // Execute the test-auth-live script
  execSync(`node "${scriptPath}"`, {
    stdio: 'inherit', // This will show the output in real-time
    encoding: 'utf8',
  });

  console.log('\n✅ Script execution completed!');
} catch (error: any) {
  console.error('❌ Error running test-auth-live script:', error.message);
  process.exit(1);
}

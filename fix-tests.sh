cat << 'PATCH' > /tmp/codeRunner.test.js.diff
<<<<<<< SEARCH
describe('Cortex Code Sandbox Runner', () => {
=======
import { execSync } from 'child_process';

let sandboxAvailable = false;
try {
  execSync('which firejail', { stdio: 'ignore' });
  sandboxAvailable = true;
} catch (e) {
  // firejail not found
}

describe('Cortex Code Sandbox Runner', { skip: !sandboxAvailable }, () => {
>>>>>>> REPLACE
PATCH
patch backend/src/utils/codeRunner.test.js < /tmp/codeRunner.test.js.diff

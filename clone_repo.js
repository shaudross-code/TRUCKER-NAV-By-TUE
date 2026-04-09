/* eslint-disable */
const { execSync } = require('child_process');
try {
  execSync('git clone https://github.com/shaudross-code/TRUCKER-NAV-By-TUE.git /tmp/repo', { stdio: 'inherit' });
  console.log('Successfully cloned repository');
} catch (e) {
  console.error('Failed to clone repository:', e.message);
}

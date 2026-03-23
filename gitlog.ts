import { execSync } from 'child_process';
try {
  const output = execSync('git diff HEAD~1 HEAD components/NavigationView.tsx').toString();
  console.log(output);
} catch (e) {
  console.error(e);
}

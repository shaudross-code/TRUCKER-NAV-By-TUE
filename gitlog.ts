import { execSync } from 'child_process';
try {
  const output = execSync('git log -p components/NavigationView.tsx | grep -C 10 "className: \'"').toString();
  console.log(output);
} catch (e) {
  console.error(e);
}

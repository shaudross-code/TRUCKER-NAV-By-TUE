import { execSync } from 'child_process';
try {
  const output = execSync('git log --since="2026-03-02 20:00:00" --until="2026-03-02 21:00:00" -p components/NavigationView.tsx').toString();
  console.log(output.substring(0, 5000));
} catch (e) {
  console.error(e);
}

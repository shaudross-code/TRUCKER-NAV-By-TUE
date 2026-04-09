/* eslint-disable */
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy hooks
copyDir('/app/applet/temp_repo/hooks', '/app/applet/hooks');

// Copy utils
copyDir('/app/applet/temp_repo/utils', '/app/applet/utils');

// Copy missing components (only if they don't exist, or overwrite all?)
// Let's copy all components from temp_repo to components, but maybe NOT overwrite existing ones to preserve user's work?
// Actually, the user said "update exact code", maybe they want everything overwritten?
// Let's just copy the missing ones first to be safe.
const componentsSrc = '/app/applet/temp_repo/components';
const componentsDest = '/app/applet/components';
const entries = fs.readdirSync(componentsSrc, { withFileTypes: true });
for (let entry of entries) {
  if (entry.isFile()) {
    const destPath = path.join(componentsDest, entry.name);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(path.join(componentsSrc, entry.name), destPath);
      console.log('Copied missing component:', entry.name);
    }
  }
}

console.log('Done copying missing files.');

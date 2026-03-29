#!/bin/sh
set -e

echo "=== Building Frontend Artifacts ==="

# Use the directory where this script lives as the project root.
# This avoids hardcoding paths like /workspace/app or /workspace/source.
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$SCRIPT_DIR"

echo "Working directory: $(pwd)"

# Install dependencies
echo "Installing dependencies..."
if [ -f yarn.lock ]; then
  yarn install --frozen-lockfile 2>/dev/null || yarn install
else
  npm ci 2>/dev/null || npm install
fi

# Build the Vite frontend
echo "Building frontend with Vite..."
yarn build

echo "=== Frontend build complete ==="
echo "Artifacts directory: $(pwd)/dist"
ls -la dist/ 2>/dev/null || echo "Warning: dist/ directory not found"

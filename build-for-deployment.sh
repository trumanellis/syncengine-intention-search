#!/bin/bash

# Build script for deployment
# Handles local dependency and creates deployable build

set -e

echo "🚀 Building Synchronicity Engine for deployment..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run this from the project root."
  exit 1
fi

# Option 1: Copy local dependency into node_modules
echo "📦 Copying local WebAuthn package..."
mkdir -p node_modules/@le-space
cp -r ../orbitdb-identity-provider-webauthn-did node_modules/@le-space/orbitdb-identity-provider-webauthn-did

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building static site..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "📂 Static files are in: ./build"
echo ""
echo "Next steps:"
echo "1. Upload all files from ./build to your Namecheap public_html"
echo "2. Create/update .htaccess (see DEPLOYMENT_GUIDE.md)"
echo "3. Ensure HTTPS is enabled"
echo ""
echo "Quick upload via FTP:"
echo "  - Connect to your Namecheap FTP"
echo "  - Navigate to public_html"
echo "  - Upload contents of ./build directory"
echo ""

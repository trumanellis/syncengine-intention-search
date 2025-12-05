# Deployment Guide - Namecheap Hosting

This guide will help you deploy the Synchronicity Engine to your Namecheap hosting.

## Prerequisites

⚠️ **Important**: This app requires HTTPS for WebAuthn to work properly. Ensure your Namecheap hosting has SSL/TLS enabled.

## Option 1: Direct Static Hosting (Recommended)

### Step 1: Build the Static Site

```bash
# Build the application
npm run build
```

This creates a `build` directory with all static files.

### Step 2: Upload via cPanel File Manager or FTP

**Using cPanel File Manager:**
1. Log into your Namecheap cPanel
2. Navigate to **File Manager**
3. Go to `public_html` (or your domain's root directory)
4. Upload all contents from the `build` directory
5. Ensure `.htaccess` file is uploaded (see below)

**Using FTP:**
1. Connect via FTP client (FileZilla, etc.)
2. Navigate to `public_html`
3. Upload all files from `build` directory

### Step 3: Configure .htaccess

Create/update `.htaccess` in your `public_html` directory:

```apache
# Enable HTTPS redirect (REQUIRED for WebAuthn)
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# SPA routing - redirect all requests to index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]

# Security headers
<IfModule mod_headers.c>
  # CORS headers (if needed for API calls)
  Header set Access-Control-Allow-Origin "*"

  # Security headers
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"

  # IMPORTANT: Enable SharedArrayBuffer for WASM
  Header set Cross-Origin-Embedder-Policy "require-corp"
  Header set Cross-Origin-Opener-Policy "same-origin"
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache control
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType image/x-icon "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>
```

### Step 4: Fix Local Dependency Issue

Before building, you need to publish the WebAuthn package or replace it with a public version:

**Option A: Use npm link (for development)**
```bash
cd ../orbitdb-identity-provider-webauthn-did
npm link
cd ../syncengine-intention-search
npm link @le-space/orbitdb-identity-provider-webauthn-did
npm run build
```

**Option B: Publish to npm (recommended for production)**
```bash
cd ../orbitdb-identity-provider-webauthn-did
npm publish --access public
cd ../syncengine-intention-search
# Update package.json to use published version
npm install @le-space/orbitdb-identity-provider-webauthn-did@latest
npm run build
```

**Option C: Copy package directly**
```bash
cp -r ../orbitdb-identity-provider-webauthn-did node_modules/@le-space/
npm run build
```

## Option 2: Using GitHub Pages (Alternative)

If Namecheap hosting doesn't support the required headers, use GitHub Pages:

### Step 1: Update svelte.config.js

```javascript
import adapter from '@sveltejs/adapter-static';

const config = {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: true
    }),
    paths: {
      base: process.env.NODE_ENV === 'production' ? '/syncengine-intention-search' : ''
    }
  }
};

export default config;
```

### Step 2: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: 'build'

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

### Step 3: Enable GitHub Pages

1. Go to repository Settings → Pages
2. Set Source to "GitHub Actions"
3. Push to main branch

## Important Notes

### WebAuthn Requirements
- **HTTPS is MANDATORY** - WebAuthn will not work over HTTP
- Most browsers require `https://` or `localhost` for WebAuthn
- Ensure your Namecheap domain has a valid SSL certificate

### WASM/SharedArrayBuffer Requirements
- Requires specific CORS headers (see .htaccess above)
- Some shared hosting may not support these headers
- If headers aren't working, ML features may be limited

### Browser Compatibility
- Chrome 67+, Firefox 60+, Safari 14+ for WebAuthn
- Modern browsers for WASM and SharedArrayBuffer

## Troubleshooting

### Issue: "WebAuthn not supported"
**Solution**: Ensure you're accessing via HTTPS with a valid certificate

### Issue: "SharedArrayBuffer is not defined"
**Solution**: Check that COOP/COEP headers are set correctly in .htaccess

### Issue: Build fails with local dependency error
**Solution**: Follow Option C above to copy the local package

### Issue: Blank page after deployment
**Solution**:
1. Check browser console for errors
2. Verify .htaccess SPA routing is working
3. Ensure all files uploaded correctly

### Issue: 404 on page refresh
**Solution**: .htaccess rewrite rules not working. Verify:
```bash
# Check if mod_rewrite is enabled in cPanel
```

## Testing Deployment

1. Visit `https://yourdomain.com`
2. You should see the Synchronicity Engine interface
3. Try WebAuthn authentication (Face ID/Touch ID/Windows Hello)
4. Check browser console for any errors

## Performance Optimization

Already configured in the build:
- Static prerendering where possible
- CSS/JS minification
- Tree-shaking of unused code
- Efficient WASM loading

## Support

If you encounter issues:
1. Check Namecheap cPanel error logs
2. Check browser console for client-side errors
3. Verify SSL certificate is valid
4. Contact Namecheap support for .htaccess/header issues

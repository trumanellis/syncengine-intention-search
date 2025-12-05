# GitHub Pages Setup Guide for syncengine.earth

This guide will help you switch your GitHub Pages deployment from the old repo to the new `syncengine-intention-search` repo.

## ✅ What's Already Done

- [x] SvelteKit configured for static deployment
- [x] GitHub Actions workflow created (auto-deploys on push to main)
- [x] CNAME file created with `syncengine.earth`
- [x] WebAuthn dependency configured for CI/CD

## 📋 Steps to Complete

### Step 1: Enable GitHub Pages in the New Repo

1. Go to https://github.com/trumanellis/syncengine-intention-search/settings/pages
2. Under "Source", select **GitHub Actions** (not Deploy from a branch)
3. Click **Save**

That's it for this step! The workflow will handle everything else.

### Step 2: Push the Changes to Trigger First Deployment

The GitHub Actions workflow will automatically run when you push. It will:
- Build the SvelteKit app
- Deploy to GitHub Pages
- Configure the custom domain

### Step 3: Wait for DNS Propagation

After the first deployment completes:
1. Go to https://github.com/trumanellis/syncengine-intention-search/settings/pages
2. You should see **"Your site is live at https://syncengine.earth"**
3. Check the box for **"Enforce HTTPS"** (required for WebAuthn)

⏳ It may take 5-10 minutes for the first deployment to complete.

### Step 4: Verify DNS Records (If Needed)

Your DNS should already be pointing to GitHub Pages from the old setup, but verify these records exist at your domain registrar:

**For APEX domain (syncengine.earth):**
```
Type: A
Name: @
Value: 185.199.108.153
```
```
Type: A
Name: @
Value: 185.199.109.153
```
```
Type: A
Name: @
Value: 185.199.110.153
```
```
Type: A
Name: @
Value: 185.199.111.153
```

**For www subdomain (optional):**
```
Type: CNAME
Name: www
Value: trumanellis.github.io
```

### Step 5: Disable the Old Deployment

Once the new site is live and working:

1. Find the old repo serving syncengine.earth:
   - Check `syncengine-static`
   - Or check if you have a `sync-evolve` organization repo

2. Go to the old repo's Settings → Pages

3. Under "Source", select **None** (this disables GitHub Pages)

4. Optionally: Archive the old repo
   - Settings → General → Danger Zone → Archive this repository

## 🚀 How Auto-Deployment Works

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically:

1. **Trigger on every push to `main` branch**
2. Checkout the code
3. Fetch the WebAuthn dependency
4. Install dependencies
5. Build the SvelteKit app
6. Deploy to GitHub Pages

You can manually trigger a deployment:
- Go to Actions tab
- Click "Deploy to GitHub Pages"
- Click "Run workflow"

## 🔧 Troubleshooting

### Issue: "Deploy from branch" is selected instead of "GitHub Actions"

**Solution**:
1. Go to Settings → Pages
2. Change Source to "GitHub Actions"
3. The workflow will run automatically on next push

### Issue: Build fails with dependency errors

**Solution**: The workflow is configured to fetch the WebAuthn package from the Le-Space organization. If it fails:
1. Check https://github.com/Le-Space/orbitdb-identity-provider-webauthn-did is accessible
2. Check the Actions tab for detailed error logs

### Issue: Custom domain not working

**Solution**:
1. Verify CNAME file exists in `/static/CNAME`
2. Check DNS records are pointing to GitHub Pages IPs
3. Wait 24 hours for DNS propagation
4. Go to Settings → Pages → Custom domain → Click "Save" again

### Issue: SSL certificate not available

**Solution**:
1. Wait 10-15 minutes after first deployment
2. Make sure "Enforce HTTPS" is checked
3. GitHub automatically provisions Let's Encrypt certificates
4. If it fails, try removing and re-adding the custom domain

### Issue: 404 errors on the deployed site

**Solution**:
1. Check the `fallback: 'index.html'` is in `svelte.config.js` (already done)
2. Verify the build completed successfully in Actions tab
3. Check that `.htaccess` or `_headers` aren't interfering

## 📊 Monitoring Deployments

View deployment status:
- **Actions Tab**: https://github.com/trumanellis/syncengine-intention-search/actions
- **Environments**: https://github.com/trumanellis/syncengine-intention-search/deployments

Each successful deployment will show:
- ✅ Green checkmark
- Deployment URL
- Time and commit

## 🔄 Making Updates

After initial setup, updates are automatic:

```bash
# Make changes to your code
git add .
git commit -m "Your changes"
git push

# GitHub Actions automatically builds and deploys!
# Check the Actions tab to watch progress
```

## 🌐 Expected URLs

After setup completes:

- **Production**: https://syncengine.earth
- **GitHub Pages URL**: https://trumanellis.github.io/syncengine-intention-search (redirects to custom domain)
- **Old site**: Will be disabled after Step 5

## ⚠️ Important Notes

1. **HTTPS is required** - WebAuthn won't work without it
2. **First deployment takes longer** - SSL cert provisioning can take 10-15 minutes
3. **DNS changes take time** - Can take up to 24 hours to fully propagate
4. **Keep the CNAME file** - Never delete `/static/CNAME`
5. **Don't disable Actions** - This is how deployment works

## 🆘 Need Help?

If something isn't working:

1. Check the Actions tab for build errors
2. Check Settings → Pages for DNS/SSL status
3. Use `dig syncengine.earth` to verify DNS records
4. Check browser console for client-side errors

## 🎉 Success Checklist

You'll know everything is working when:

- [ ] Actions tab shows green checkmark for latest deploy
- [ ] Settings → Pages shows "Your site is live at https://syncengine.earth"
- [ ] HTTPS is enforced (lock icon in browser)
- [ ] https://syncengine.earth loads the new site
- [ ] WebAuthn authentication works (biometric prompt appears)
- [ ] Old repo's Pages is disabled

---

**Next Steps**: Push these changes to trigger the first deployment!

```bash
git add .
git commit -m "Configure GitHub Pages with custom domain"
git push
```

Then follow Step 1 above to enable GitHub Pages with GitHub Actions.

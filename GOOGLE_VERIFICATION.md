# Google Domain Verification for HabitBeaver

## What You've Already Done ✅

1. ✅ Created public landing page at `/` (root)
2. ✅ Added Privacy Policy link in navigation and footer
3. ✅ Added Terms of Service link in navigation and footer
4. ✅ Landing page explains the app purpose
5. ✅ Landing page shows "HabitBeaver" name prominently

## Domain Verification Steps

### Option 1: HTML File Upload (Easiest)

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click "Add Property" → Enter `https://habitbeaver.app`
3. Choose "HTML file upload" method
4. Google will give you a file like `google1234567890abcdef.html`
5. Download that file
6. Place it in `public/` directory of your Rails app
7. Deploy to production
8. Verify the file is accessible at: `https://habitbeaver.app/google1234567890abcdef.html`
9. Go back to Google Search Console and click "Verify"

### Option 2: HTML Tag (Alternative)

1. Google will give you a meta tag like:
   ```html
   <meta name="google-site-verification" content="abc123..." />
   ```
2. Add this to `app/views/home/landing.html.erb` inside the `<head>` section
3. Deploy to production
4. Go back to Google Search Console and click "Verify"

### Option 3: DNS Record (Most Reliable)

1. Google will give you a TXT record like:
   ```
   google-site-verification=abc123...
   ```
2. Add this as a TXT record in your domain DNS settings
3. Wait for DNS propagation (can take up to 48 hours)
4. Go back to Google Search Console and click "Verify"

## After Domain Verification

Once your domain is verified in Google Search Console:

1. Go back to [Google Cloud Console OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Submit for verification again
3. All the branding issues should be resolved!

## Checklist for OAuth Verification

- ✅ Home page is public (not behind login)
- ✅ Home page has Privacy Policy link
- ✅ Home page has Terms of Service link
- ✅ Home page explains app purpose
- ✅ App name "HabitBeaver" is displayed
- ⏳ Domain ownership verified (you need to do this)

## Current URLs for Google OAuth Consent Screen

- **Application home page**: `https://habitbeaver.app`
- **Privacy policy**: `https://habitbeaver.app/privacy`
- **Terms of service**: `https://habitbeaver.app/terms`
- **Authorized domains**: `habitbeaver.app`

Make sure these match exactly in your OAuth consent screen settings!

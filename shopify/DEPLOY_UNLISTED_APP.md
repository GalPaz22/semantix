# How to Deploy Semantix as Unlisted App for New Clients

This guide explains how to deploy the Semantix Shopify app as an **unlisted app** for individual clients.

---

## What is an Unlisted App?

An **unlisted app** is:
- A private Shopify app only you can install
- Not listed in the Shopify App Store
- Perfect for distributing to specific clients
- You control who gets access

---

## Prerequisites

Before deploying:
1. ✅ Shopify Partners account
2. ✅ Access to the client's Shopify store
3. ✅ Node.js and npm installed
4. ✅ Shopify CLI configured

---

## Step-by-Step Deployment

### 1. Create Unlisted App in Partners Dashboard

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Click **Apps** → **Create app**
3. Choose **Create app manually**
4. Fill in:
   - **App name**: `Semantix - [Client Name]`
   - **App URL**: `https://semantix-ai.com`
   - **Allowed redirection URLs**:
     - `https://semantix-ai.com/api/auth/callback`
     - `https://semantix-ai.com/api/auth`
5. Under **Distribution**, select **Unlisted**
6. Save and copy:
   - ✅ **Client ID**
   - ✅ **Client Secret**

---

### 2. Create App Configuration File

Navigate to the Shopify app directory:

```bash
cd /path/to/semantix/shopify/semantix
```

Create a new TOML file for the client:

```bash
cp shopify.app.toml shopify.app.[client-name].toml
```

For example, for Promise Cosmetics:
```bash
cp shopify.app.toml shopify.app.semantix-promise.toml
```

---

### 3. Edit Configuration File

Open the new TOML file and update:

```toml
# Learn more about configuring your app at https://shopify.dev/docs/apps/tools/cli/configuration

client_id = "YOUR_NEW_CLIENT_ID"
name = "semantix-[client-name]"
handle = "semantix-[client-name]-[unique]"  # Must be globally unique!
application_url = "https://semantix-ai.com"
embedded = false

[build]

[webhooks]
api_version = "2025-04"

[access_scopes]
scopes = "read_themes,write_themes"

[auth]
redirect_urls = [ 
  "https://semantix-ai.com/api/auth/callback",
  "https://semantix-ai.com/api/auth"
]

[pos]
embedded = false

[capabilities]
theme_app_extension = true
```

**Important**: The `handle` must be **globally unique** across all Shopify apps!

---

### 4. Deploy the Extension

Run the deployment command:

```bash
npm run deploy -- --config=shopify.app.[client-name].toml --force
```

For Promise Cosmetics:
```bash
npm run deploy -- --config=shopify.app.semantix-promise.toml --force
```

Wait for deployment to complete. You'll see:
```
✅ New version released to users.
```

---

### 5. Get Installation URL

After deployment:

1. Go to [Partners Dashboard](https://partners.shopify.com/)
2. Navigate to your app
3. Go to **Distribution**
4. Copy the **Installation URL**

Or construct it manually:
```
https://partners.shopify.com/[PARTNER_ID]/apps/[APP_ID]/install?shop=[client-store].myshopify.com
```

---

### 6. Send to Client

Send the client:
1. ✅ Installation URL
2. ✅ Installation guide (see `PROMISE_INSTALLATION_GUIDE.md`)
3. ✅ Your contact info for support

---

## Client Onboarding Checklist

After the client installs the app:

- [ ] Client registers at https://semantix-ai.com
- [ ] Client completes onboarding with store details:
  - Shopify domain: `[client-store].myshopify.com`
  - Categories
  - Product types
  - Store context
- [ ] Client gets API key from dashboard
- [ ] Client enables extension in Theme Editor
- [ ] Client pastes API key in extension settings
- [ ] Test search functionality

---

## Configuration Files

Current client configurations:

### Promise Cosmetics
- **File**: `shopify.app.semantix-promise.toml`
- **Client ID**: `58059f03b76c8ed5938c8ca5b10c121d`
- **Handle**: `semantix-promise-cosmetics`
- **Store**: `promise-cosmetics.myshopify.com`

### Template (Copy for new clients)
- **File**: `shopify.app.toml`
- **Client ID**: `ed3834d550c5d814851e0ad46493ca2c`
- **Handle**: `semantix-1`

---

## Troubleshooting

### Error: "App handle must be unique"
- Change the `handle` in your TOML file to something unique
- Example: `semantix-promise-cosmetics-v2`

### Error: "locales directory not found"
- This is a warning, deployment will still succeed
- The extension doesn't require locales for basic functionality

### Deployment fails
- Check your internet connection
- Verify you're logged in: `npm run shopify auth login`
- Ensure Client ID is correct in TOML file

### Client can't see the extension
- Verify deployment succeeded
- Check that client installed the app
- Extension appears under **App embeds** in Theme Editor

---

## Quick Command Reference

```bash
# Deploy with custom config
npm run deploy -- --config=shopify.app.[client].toml --force

# Dev mode (for testing)
npm run dev -- --config=shopify.app.[client].toml

# Check app info
npm run info -- --config=shopify.app.[client].toml

# Reset configuration
npm run deploy -- --config=shopify.app.[client].toml --reset
```

---

## Files Structure

```
shopify/semantix/
├── shopify.app.toml                      # Main/template config
├── shopify.app.semantix-promise.toml     # Promise Cosmetics config
├── extensions/
│   └── semantix-public-extension/
│       ├── assets/
│       │   └── semantix-tracking.js      # Tracking script
│       ├── blocks/
│       │   └── semantix-app.liquid       # Main extension
│       └── shopify.extension.toml        # Extension config
├── package.json
└── README.md
```

---

## Support

For deployment issues:
- 📧 Email: galpaz@semantix-ai.com
- 🌐 Dashboard: https://semantix-ai.com/dashboard

---

**Happy deploying!** 🚀


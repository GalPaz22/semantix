# Semantix AI - Installation Guide for Promise Cosmetics

## Welcome to Semantix AI! 🎉

This guide will help you install and configure Semantix AI search on your Promise Cosmetics store.

---

## Step 1: Install the Shopify App

1. Click on the installation link provided by Semantix team
2. You'll be redirected to Shopify to authorize the app
3. Click **"Install"** to grant permissions:
   - ✅ Read themes
   - ✅ Write themes
4. The app will be installed in your store

---

## Step 2: Register at Semantix Dashboard

1. Go to: **https://semantix-ai.com**
2. Click **"Sign Up"** and create an account
3. Use your business email (e.g., `tech@promise-cosmetics.com`)
4. Verify your email

---

## Step 3: Complete Onboarding

After logging in, you'll go through a quick setup:

### Platform Details
- **Platform**: Select **Shopify**
- **Shopify Domain**: `promise-cosmetics.myshopify.com`
- **Store Name**: `promise-cosmetics` (internal database name)

### Store Configuration
- **Categories**: Add your main product categories
  - Example: `Skincare, Masks, Serums, Cleansers, Kits`
  
- **Product Types**: Specify types if different from categories
  
- **Store Context**: Describe your store for better AI understanding
  - Example: `Premium skincare and cosmetics with natural ingredients, Dead Sea mud products, anti-aging solutions`

### Sync Mode
- Choose **"Full Sync"** to index all products with images and descriptions
- This will take a few minutes depending on your product count

---

## Step 4: Get Your API Key

1. After the sync completes, go to **Dashboard**
2. In the **Settings** panel, you'll see your **API Key**
3. Copy it - you'll need it in the next step

Example: `sk_live_abc123xyz789...`

---

## Step 5: Activate the Theme Extension

Now let's enable Semantix in your store theme:

1. Go to **Shopify Admin** → **Online Store** → **Themes**
2. Click **Customize** on your active theme
3. In the left sidebar, scroll down to **App embeds** (bottom section)
4. Find **"⚡ Semantix AI"** and toggle it **ON** ✅
5. Click on the Semantix extension to configure it
6. Paste your **API Key** in the settings
7. Configure optional settings:
   - ✅ **Enable Extension**: ON
   - ✅ **Load on Search Pages**: ON
   - ✅ **Load on Collection Pages**: ON (optional)
   - ✅ **Enable Event Tracking**: ON
   - 🐛 **Debug Mode**: OFF (turn on only for testing)
8. Click **Save** in the top right

---

## Step 6: Test Your Installation

1. Go to your store: **https://promise-cosmetics.com**
2. Use the search bar and try:
   - "serum for dry skin"
   - "anti-aging mask"
   - "natural cleanser"
3. You should see AI-powered search results!

---

## Features You Get

✨ **Intelligent Search**: Natural language understanding
- Customers can search "products for oily skin" instead of exact product names

📊 **Analytics**: Track what customers search for
- View popular queries in your Semantix dashboard

🎯 **Personalization**: Smart product recommendations
- Based on search behavior and context

🚀 **Fast Performance**: CDN-delivered results
- Lightning-fast search with global edge caching

---

## Support

Need help? Contact the Semantix team:
- 📧 Email: support@semantix-ai.com
- 🌐 Dashboard: https://semantix-ai.com/dashboard
- 📚 Documentation: https://semantix-ai.com/docs

---

## Troubleshooting

### Search not working?
1. Make sure the extension is **enabled** in Theme Editor → App embeds
2. Verify your **API Key** is correctly entered
3. Check that the product sync completed (Dashboard → Settings)

### Products not showing up?
1. Go to Dashboard → **Settings** → **Resync Products**
2. Wait for sync to complete (usually 2-5 minutes)

### Need to update products?
- Semantix auto-syncs when you add/edit products in Shopify
- Manual sync available in Dashboard if needed

---

**Thank you for choosing Semantix AI!** 🎉

We're here to help your customers find exactly what they need.


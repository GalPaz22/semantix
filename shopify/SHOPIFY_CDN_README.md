# 🚀 Semantix AI - Shopify CDN Extension

## סקירה כללית

Extension זה טוען את Semantix AI ישירות מ-CDN, בדומה לפלאגין WooCommerce.  
**לא צריך backend proxy** - הכל עובד ישירות מהדפדפן עם API key.

---

## 📦 מה כולל?

### ✅ מה **כן** נכלל:
- ✨ **טעינה אוטומטית מ-CDN** - הסקריפטים נטענים מ-Cloudflare Workers
- 🔑 **ניהול API Key** - הגדרה פשוטה דרך Theme Editor
- 🎯 **זיהוי דפים אוטומטי** - נטען רק בעמודי חיפוש וקולקציות
- 🪪 **Session Management** - ניהול session ID אוטומטי עם cookies
- 🐛 **Debug Mode** - פאנל debug + console logging
- 🌍 **Metadata** - העברת shop, locale, currency, theme ל-API
- ⚡ **Performance** - async/defer loading, no blocking

### ❌ מה **לא** נכלל (כי Shopify App Extensions לא יכולים):
- 🚫 **Backend Proxy** - אין דרך להסתיר API key (ב-Shopify זה נחשף לדפדפן)
- 🚫 **Server-side Tracking** - WooCommerce hooks כמו `add_to_cart` (צריך לעשות client-side)
- 🚫 **PHP Logic** - כל הלוגיקה ב-JavaScript בלבד

---

## 🔧 התקנה

### 1. הכנת הקבצים

```bash
cd /Users/galpaz/Desktop/semantix-front-hebrew/semantix/shopify
```

הקבצים שצריך:
```
shopify/semantix/extensions/semantix-public-extension/
├── blocks/
│   └── semantix-app.liquid          ← ✅ הקובץ העיקרי
└── shopify.extension.toml
```

### 2. Deploy ל-Shopify

```bash
shopify app deploy
```

### 3. הגדרה ב-Theme Editor

1. **בחר Theme** → Customize
2. **App embeds** (בצד) → `⚡ Semantix AI`
3. **הפעל את ה-toggle**
4. **הזן API Key** מ-dashboard.semantix-ai.com
5. **Save**

---

## ⚙️ הגדרות זמינות

| Setting | Default | תיאור |
|---------|---------|-------|
| **API Key** | - | מפתח API מ-dashboard (חובה) |
| **CDN Base URL** | `https://rough-lab-9118.galpaz2210.workers.dev` | כתובת CDN (בדר"כ לא משנים) |
| **Enable Extension** | ✅ | הפעלה/כיבוי כללי |
| **Load on Search Pages** | ✅ | טעינה בעמודי `/search?q=...` |
| **Load on Collection Pages** | ✅ | טעינה בעמודי `/collections/...` |
| **Debug Mode** | ❌ | הצגת פאנל debug + logs |

---

## 🎯 איך זה עובד?

### 1. זיהוי דף
```javascript
// נטען רק בדפים רלוונטיים:
✅ /search?q=shoes
✅ /collections/all
✅ /collections/summer
❌ /products/shoe-123 (לא נטען)
❌ /pages/about (לא נטען)
```

### 2. Session Management
```javascript
// יצירה אוטומטית של session ID
const sessionId = getOrCreateSession();
// → sess_a1b2c3d4e5f6...

// נשמר ב-cookie ל-30 יום
setCookie('semantix_session_id', sessionId, 30);
```

### 3. טעינת סקריפטים
```javascript
// 1. הגדרת קונפיגורציה גלובלית
window.SemantixSettings = {
  apiKey: 'your-api-key',
  apiBase: 'https://api.semantix-ai.com',
  engineSrc: 'https://cdn.../semantix-engine.min.js',
  platform: 'shopify',
  sessionId: 'sess_...',
  metadata: { shop, locale, currency, theme }
};

// 2. טעינת loader מ-CDN
<script src="https://cdn.../semantix-loader.min.js"></script>

// 3. ה-loader טוען את ה-engine ומאתחל
```

### 4. API Calls (ישירות מהדפדפן)
```javascript
// ⚠️ שים לב: בניגוד ל-WooCommerce, אין proxy!
// הקריאות הולכות ישירות ל-API עם ה-API key

fetch('https://api.semantix-ai.com/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'  // ← נחשף לדפדפן!
  },
  body: JSON.stringify({
    query: 'shoes',
    session_id: sessionId,
    platform: 'shopify'
  })
});
```

---

## 🔒 אבטחה - חשוב לדעת!

### ⚠️ API Key חשוף

בניגוד ל-WooCommerce שעושה proxy, ב-Shopify App Extensions:
```
❌ אין backend → אין proxy → API key נחשף לדפדפן
```

**פתרונות אפשריים:**

#### 1. **Rate Limiting בצד השרת**
```javascript
// בצד ה-API שלך
if (req.headers['x-api-key'] === apiKey) {
  // בדוק rate limit לפי session_id
  if (isRateLimited(req.body.session_id)) {
    return { error: 'Too many requests' };
  }
}
```

#### 2. **Domain Validation**
```javascript
// אפשר רק domains מאושרים
const allowedDomains = ['myshop.myshopify.com'];
if (!allowedDomains.includes(req.headers.origin)) {
  return { error: 'Unauthorized domain' };
}
```

#### 3. **Read-only API Key**
- צור API key נפרד ל-Shopify שיכול רק לקרוא (לא לכתוב)
- הגבל אותו רק לאנדפוינטים של חיפוש

---

## 🐛 Debug Mode

### הפעלה:
Theme Editor → Semantix AI → `🐛 Debug Mode` → Save

### מה תראה:

#### 1. פאנל צף (פינה ימנית תחתונה):
```
🤖 Semantix CDN Active
Session: 1706112000
Shop: My Store
[View Debug Info]
```

#### 2. Console Logs:
```javascript
[Semantix] Semantix CDN Extension v2.0
[Semantix] Config: { apiKey: "...", cdnBase: "...", ... }
[Semantix] ✅ Loading on search page
[Semantix] Created new session: sess_abc123...
[Semantix] 🚀 Configuration ready
[Semantix] ✅ Loaded: https://.../semantix-loader.min.js
[Semantix] ✅ Semantix initialized successfully
```

#### 3. Debug Tools (console):
```javascript
// בקונסול:
window.SemantixDebug
// → {
//     config: {...},
//     reload: function(),
//     getSettings: function()
//   }

// טען מחדש
SemantixDebug.reload();

// בדוק הגדרות
console.log(SemantixDebug.getSettings());
```

---

## 📊 Metadata שנשלח ל-API

```javascript
{
  query: "shoes",
  session_id: "sess_abc123...",
  platform: "shopify",
  metadata: {
    shop: "mystore.myshopify.com",
    locale: "en",
    currency: "USD",
    theme: "Dawn"
  }
}
```

---

## 🆚 השוואה: WooCommerce vs Shopify

| תכונה | WooCommerce | Shopify Extension |
|-------|-------------|-------------------|
| **Backend Proxy** | ✅ PHP | ❌ אין backend |
| **API Key Hiding** | ✅ מוסתר | ❌ חשוף |
| **Server-side Tracking** | ✅ WooCommerce hooks | ❌ Client-side בלבד |
| **Session Management** | ✅ PHP sessions + cookies | ✅ Cookies בלבד |
| **CDN Loading** | ✅ | ✅ |
| **Page Detection** | ✅ `is_search()`, `is_shop()` | ✅ URL parsing |
| **Easy Config** | ✅ Admin panel | ✅ Theme editor |

---

## 📝 TODO: תכונות נוספות

### Client-side Tracking
צריך להוסיף ב-JavaScript:

```javascript
// 1. Add to Cart
document.addEventListener('click', (e) => {
  if (e.target.matches('[name="add"], .product-form button')) {
    trackAddToCart({
      product_id: getProductId(),
      session_id: sessionId,
      search_query: getLastSearch()
    });
  }
});

// 2. Checkout Events
if (window.Shopify?.Checkout) {
  // Track checkout_initiated, checkout_completed
}
```

### Zero-results Rescue
```javascript
// בדוק אם יש תוצאות
if (document.querySelector('.collection-empty, .no-results')) {
  // קרא ל-API לקבל המלצות
  fetchRescueResults(query);
}
```

---

## 🚀 Deploy Checklist

- [ ] וידוא שה-CDN עובד: `curl https://rough-lab-9118.galpaz2210.workers.dev/semantix-loader.min.js`
- [ ] Deploy: `shopify app deploy`
- [ ] Enable ב-Theme Editor
- [ ] הזנת API Key
- [ ] בדיקה בעמוד חיפוש: `/search?q=test`
- [ ] בדיקה בעמוד קולקציה: `/collections/all`
- [ ] בדיקת Debug Mode
- [ ] בדיקת Console Logs
- [ ] בדיקת Network Requests (API calls)

---

## 🔗 קישורים

- **Dashboard:** https://dashboard.semantix-ai.com
- **API Docs:** https://api.semantix-ai.com/docs
- **CDN:** https://rough-lab-9118.galpaz2210.workers.dev
- **Support:** support@semantix-ai.com

---

## ❓ שאלות נפוצות

### 1. למה ה-API Key חשוף?
Shopify App Extensions לא יכולים להריץ PHP/Node.js backend, אז אין אפשרות לעשות proxy.

### 2. איך מונעים שימוש לרעה?
- Rate limiting בצד השרת
- Domain validation
- API key נפרד ל-Shopify (read-only)

### 3. איך עושים tracking של Add to Cart?
צריך להוסיף JavaScript event listeners (ראה TODO למעלה).

### 4. למה לא נטען בכל הדפים?
Performance - נטען רק בדפים שצריכים (חיפוש/קולקציות).

### 5. איך משנים את כתובת ה-CDN?
Theme Editor → CDN Base URL → Save

---

**🎉 מוכן לשימוש!**


# 🔧 Endpoint URL Fix

## 🐛 הבעיה שתוקנה

### תסמינים:
```
Request URL: https://api.semantix-ai.comhttps://api.semantix-ai.com/fast-search
                                      ^
                                      URL מוכפל!
```

### הסיבה:
ה-CDN engine בונה URLs כך:
```javascript
const url = apiBase + endpoints.fastSearch;
```

אבל ה-extension היה מגדיר:
```javascript
endpoints: {
  fastSearch: `${CONFIG.apiBase}/fast-search`  // ❌ כבר כולל apiBase!
}
```

**תוצאה:** 
```
https://api.semantix-ai.com + https://api.semantix-ai.com/fast-search
= https://api.semantix-ai.comhttps://api.semantix-ai.com/fast-search ❌
```

---

## ✅ הפתרון

### Before (Wrong):
```javascript
window.SemantixSettings = {
  apiBase: 'https://api.semantix-ai.com',
  endpoints: {
    siteConfig: 'https://api.semantix-ai.com/site-config',   // ❌
    search: 'https://api.semantix-ai.com/search',             // ❌
    fastSearch: 'https://api.semantix-ai.com/fast-search',    // ❌
    productClick: 'https://api.semantix-ai.com/product-click', // ❌
    searchToCart: 'https://api.semantix-ai.com/search-to-cart' // ❌
  }
};
```

### After (Correct):
```javascript
window.SemantixSettings = {
  apiBase: 'https://api.semantix-ai.com',
  endpoints: {
    siteConfig: '/site-config',      // ✅ רק הנתיב
    search: '/search',               // ✅
    fastSearch: '/fast-search',      // ✅
    productClick: '/product-click',  // ✅
    searchToCart: '/search-to-cart'  // ✅
  }
};
```

### איך ה-engine בונה את ה-URL:
```javascript
// Engine code:
const url = settings.apiBase + settings.endpoints.fastSearch;

// עם התיקון:
'https://api.semantix-ai.com' + '/fast-search'
= 'https://api.semantix-ai.com/fast-search' ✅
```

---

## 📁 קבצים שתוקנו

### 1. `blocks/semantix-app.liquid`
```liquid
// Before:
endpoints: {
  fastSearch: `${CONFIG.apiBase}/fast-search`,  // ❌
}

// After:
endpoints: {
  fastSearch: '/fast-search',  // ✅
}
```

### 2. `blocks/semantix-cdn-loader.liquid`
```liquid
// Before:
endpoints: {
  fastSearch: SEMANTIX_CONFIG.apiEndpoint + '/fast-search',  // ❌
}

// After:
endpoints: {
  fastSearch: '/fast-search',  // ✅
}
```

### 3. `assets/semantix-tracking.js`
```javascript
// Before:
const endpoint = settings.endpoints?.searchToCart || `${settings.apiBase}/search-to-cart`;

// After: (with smart detection)
let endpoint;
if (settings.endpoints?.searchToCart) {
  // Support both full URLs and paths
  endpoint = settings.endpoints.searchToCart.startsWith('http') 
    ? settings.endpoints.searchToCart  // Full URL
    : `${settings.apiBase}${settings.endpoints.searchToCart}`; // Path
} else {
  endpoint = `${settings.apiBase}/search-to-cart`; // Fallback
}
```

---

## 🎯 איך לבדוק שזה תוקן?

### 1. Deploy
```bash
cd /Users/galpaz/Desktop/semantix-front-hebrew/semantix/shopify
shopify app deploy
```

### 2. נקה Cache ו-Reload
```
Chrome DevTools → Application → Clear storage → Clear site data
Hard Reload (Cmd+Shift+R / Ctrl+Shift+R)
```

### 3. בדוק ב-Console
```javascript
// אמור לראות:
window.SemantixSettings.endpoints
// → { fastSearch: '/fast-search', ... }  ✅

// לא:
// → { fastSearch: 'https://api.semantix-ai.com/fast-search', ... }  ❌
```

### 4. בדוק ב-Network Tab
```
Filter: "semantix" or "api"

✅ נכון:
Request URL: https://api.semantix-ai.com/fast-search

❌ לא נכון:
Request URL: https://api.semantix-ai.comhttps://api.semantix-ai.com/fast-search
```

---

## 🔍 Debug Tips

### אם עדיין לא עובד:

#### 1. בדוק שה-engine מקבל paths:
```javascript
console.log(window.SemantixSettings.endpoints);
// צריך להיות: {fastSearch: "/fast-search", ...}
// לא: {fastSearch: "https://api.semantix-ai.com/fast-search", ...}
```

#### 2. בדוק את ה-CDN engine:
```bash
curl -s https://rough-lab-9118.galpaz2210.workers.dev/semantix-engine.min.js | grep "apiBase"
```

#### 3. בדוק שאין cache:
```
DevTools → Network → Disable cache (checkbox)
Hard reload
```

#### 4. בדוק שה-extension מעודכן:
```javascript
// ב-semantix-app.liquid צריך להיות:
endpoints: {
  fastSearch: '/fast-search',  // לא כולל apiBase
}
```

---

## 📊 השוואה: WooCommerce vs Shopify

### WooCommerce (עם Proxy):
```php
// PHP מטפל ב-proxy, לא חושף את ה-API
wp_remote_post(UPSTREAM . '/fast-search', [...]);

// Frontend מקבל:
endpoints: {
  fastSearch: '/wp-json/semantix/v1/fast-search'  // Local proxy
}
```

### Shopify (ישירות ל-API):
```javascript
// אין proxy, צריך לקרוא ישירות
window.SemantixSettings = {
  apiBase: 'https://api.semantix-ai.com',  // Remote API
  endpoints: {
    fastSearch: '/fast-search'  // Path only, engine adds apiBase
  }
};
```

---

## ✅ Checklist

- [x] תוקן `semantix-app.liquid`
- [x] תוקן `semantix-cdn-loader.liquid`
- [x] תוקן `semantix-tracking.js` (עם fallback חכם)
- [x] נוסף הסבר ב-comments
- [x] נוסף support ל-full URLs וגם paths (tracking.js)

---

## 🚀 Ready!

עכשיו ה-URLs צריכים להיבנות נכון:
```
✅ https://api.semantix-ai.com/fast-search
✅ https://api.semantix-ai.com/search
✅ https://api.semantix-ai.com/site-config
```

במקום:
```
❌ https://api.semantix-ai.comhttps://api.semantix-ai.com/fast-search
```


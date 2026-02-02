# 📋 Site Configuration Schema

## מבנה מלא של siteConfig

```javascript
{
  // מזהה ייחודי לאתר
  "siteId": "client-123",
  
  // דומיינים של האתר (array)
  "domains": ["example.com", "www.example.com"],
  
  // פרמטרים של query string לחיפוש (array)
  "queryParams": ["q", "s", "query", "search", "term"],
  
  // CSS Selectors
  "selectors": {
    "resultsGrid": ["ul.products", ".products", ".product-grid"],
    "productCard": ["li.product", ".grid__item", ".product-card"],
    "noResults": [".woocommerce-info", ".no-results"],
    "pageTitle": ["h1.page-title", ".page-title"],
    "resultsRoot": null,  // optional - parent container
    "searchInput": ["input[type='search']", "input[name='s']", "form[action*='search'] input"]
  },
  
  // הגדרות כרטיס מוצר native
  "nativeCard": {
    "cloneFromSelector": "ul.products li.product",
    "templateHtml": null,  // או HTML string
    "map": {
      "titleSelector": ".woocommerce-loop-product__title",
      "priceSelector": ".price",
      "imageSelector": "img",
      "linkSelector": "a.product-link"
    },
    "cleanupSelectors": [".out-of-stock", ".onsale"],
    "disableAddToCart": true
  },
  
  // התנהגות ה-injection
  "behavior": {
    "injectPosition": "prepend",  // prepend | append | afterNth
    "injectCount": 6,
    "fadeMs": 180,
    "loaderMinMs": 450,     // זמן מינימלי להצגת loader
    "waitForDomMs": 8000,   // זמן המתנה מקסימלי ל-DOM
    "loader": true
  },
  
  // הגדרות Consent Popup
  "consent": {
    "enabled": true,
    "storageKey": "semantix_consent_v3",
    "logoUrl": "https://semantix-ai.com/powered.png",
    "title": "🍪 חיפוש מותאם אישית",
    "text": "מאשרים ל־Semantix לשמור סשן לשיפור התוצאות?",
    "acceptText": "כן, אשר",
    "declineText": "לא, תודה",
    "zIndex": 1000000
  },
  
  // מעקב קליקים
  "clickTracking": {
    "enabled": true,
    "trackNativeClicks": true,       // גם מוצרים native
    "universalMode": false,          // מוד אוניברסלי - עקוב אחרי כל הקישורים
    "universalLinkSelector": "",     // CSS selector לזיהוי קישורים (למשל: "a.product-link")
    "forceNavDelay": true,           // עיכוב ניווט לשליחת tracking
    "forceNavDelayMs": 80,
    "queueKey": "semantix_click_q_v1",
    "queueMax": 25
  },
  
  // טקסטים מתחלפים ב-placeholder
  "placeholderRotate": {
    "enabled": true,
    "placeholders": [
      "חפש מוצרים…",
      "נסו: טבעת כסף",
      "נסו: שרשרת עדינה"
    ],
    "intervalMs": 2400,    // זמן בין החלפות
    "fadeMs": 220,         // זמן fade
    "startDelayMs": 600,   // עיכוב התחלתי
    "pauseOnFocus": true,  // עצור כש-input במיקוד
    "onlyIfEmpty": true    // רק כשהשדה ריק
  },
  
  // תכונות
  "features": {
    "rerankBoost": false,
    "injectIntoGrid": true,
    "zeroReplace": true
  },
  
  // טקסטים
  "texts": {
    "loader": "טוען תוצאות חכמות…"
  },
  
  // Debug
  "debug": {
    "enabled": false
  }
}
```

## שדות חדשים שנוספו

### 1. `siteId` (string)
מזהה ייחודי לאתר הלקוח. שימושי למעקב analytics וניהול multi-tenant.

### 2. `selectors.resultsRoot` (string | null)
Container גדול יותר שמכיל את הגריד. שימושי כשצריך להחליף את כל קונטיינר התוצאות.

### 3. `selectors.searchInput` (array)
סלקטורים לשדות החיפוש באתר. שימושי ל-placeholder rotation ו-tracking.

### 4. `behavior.loaderMinMs` (number)
זמן מינימלי להצגת ה-loader. מונע "flash" של loader שנעלם מהר מדי.

### 5. `behavior.waitForDomMs` (number)
זמן המתנה מקסימלי עד שה-DOM יהיה מוכן. אחרי זה יש timeout.

### 6. `consent` (object)
**Consent Popup** - חלון קופץ לקבלת הסכמה לשמירת session:
- `enabled` - האם להציג
- `storageKey` - מפתח ב-localStorage
- `logoUrl` - לוגו של Semantix
- `title` - כותרת החלון
- `text` - טקסט ההסבר
- `acceptText` / `declineText` - כפתורים
- `zIndex` - רמת z-index

### 7. `clickTracking` (object)
**מעקב קליקים** על מוצרים:
- `enabled` - האם לעקוב
- `trackNativeClicks` - גם על מוצרים native (לא רק AI)
- `universalMode` - **חדש!** מוד אוניברסלי - עקוב אחרי כל הקישורים שמתאימים ל-selector
- `universalLinkSelector` - **חדש!** CSS selector לזיהוי קישורים (למשל: `"a.product-link"` או `".product a[href*='/products/']"`)
- `forceNavDelay` - לעכב ניווט כדי לשלוח tracking
- `forceNavDelayMs` - כמה ms לעכב
- `queueKey` - מפתח ב-localStorage לתור
- `queueMax` - מקסימום פריטים בתור

**שימוש ב-Universal Mode:**
```javascript
clickTracking: {
  enabled: true,
  trackNativeClicks: true,
  universalMode: true,                    // ← הפעל מוד אוניברסלי
  universalLinkSelector: "a.my-product-link"  // ← הסלקטור שלך
}
```

### 8. `placeholderRotate` (object)
**טקסטים מתחלפים** בשדה החיפוש:
- `enabled` - האם להפעיל
- `placeholders` - מערך של טקסטים להציג
- `intervalMs` - זמן בין החלפות
- `fadeMs` - זמן אנימציית fade
- `startDelayMs` - עיכוב לפני התחלה
- `pauseOnFocus` - להפסיק כש-input במיקוד
- `onlyIfEmpty` - רק כשהשדה ריק

## איך להשתמש

### 1. דרך Admin Panel
1. הזן API Key → לחץ Fetch
2. לחץ "Load {Platform} Defaults" - טוען את כל השדות החדשים
3. ערוך ידנית אם צריך
4. לחץ "Save Credentials"

### 2. דרך API
```javascript
POST /api/admin/update-user-config
{
  "apiKey": "xxx",
  "siteConfig": { /* הקונפיג המלא */ }
}
```

### 3. דרך AI Auto-Detect
1. הדבק URL של דף חיפוש
2. לחץ "Analyze Page"
3. ה-AI ייצור את הקונפיג אוטומטית (כולל השדות החדשים)

## ברירות מחדל לפי פלטפורמה

### WooCommerce
```javascript
queryParams: ["q", "s", "query", "search", "term"]
placeholders: [
  "חפש מוצרים…",
  "נסו: טבעת כסף",
  "נסו: שרשרת עדינה",
  "נסו: מתנה ליום הולדת",
  "נסו: עגילים חדשים"
]
```

### Shopify
```javascript
queryParams: ["q", "s", "query", "search", "term"]
placeholders: [
  "Search products…",
  "Try: silver ring",
  "Try: delicate necklace",
  "Try: birthday gift",
  "Try: new earrings"
]
```

## שדות שנשמרים אוטומטית

כל השדות הבאים נשמרים אוטומטית ל-DB תחת `credentials.siteConfig`:
- ✅ `siteId`
- ✅ `consent` (כל התכונות)
- ✅ `clickTracking` (כל התכונות)
- ✅ `placeholderRotate` (כל התכונות)
- ✅ `behavior.loaderMinMs`
- ✅ `behavior.waitForDomMs`
- ✅ `selectors.resultsRoot`
- ✅ `selectors.searchInput`

## Validation

כל השדות האלה **אופציונליים**. אם לא קיימים, המערכת תשתמש בברירות מחדל:
- `consent.enabled: true`
- `clickTracking.enabled: true`
- `placeholderRotate.enabled: true`
- `behavior.loaderMinMs: 450`
- `behavior.waitForDomMs: 8000`

---

**עודכן:** 2026-01-24
**גרסה:** 2.0


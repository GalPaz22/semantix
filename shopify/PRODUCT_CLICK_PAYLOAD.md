# 📊 Product Click Payload - Documentation

## ✅ הפורמט הנכון ל-`/product-click` endpoint

### Request Structure:
```javascript
POST /product-click
Headers:
  Content-Type: application/json
  X-API-Key: {apiKey}

Body:
{
  "document": {
    "event_type": "product_click",
    "product_id": "123456",                    // Required: String
    "product_name": "Product Name",            // Required: String
    "search_query": "user search term",        // Optional: String (last search)
    "session_id": "sess_abc123...",           // Required: String
    "interaction_type": "click",               // Required: "click" | "view" | "hover"
    "position": 3,                             // Optional: Number (position in results)
    "source": "product_grid",                  // Required: String (where clicked from)
    "url": "https://store.com/products/...",  // Required: String
    "platform": "shopify",                     // Required: "shopify" | "woocommerce"
    "timestamp": "2026-01-25T12:34:56.789Z"   // Required: ISO string
  }
}
```

---

## 📋 שדות מפורטים

### `event_type` (Required)
- **Type:** `string`
- **Value:** `"product_click"`
- **תיאור:** מזהה את סוג האירוע

### `product_id` (Required)
- **Type:** `string`
- **Example:** `"7894561230"`, `"gid://shopify/Product/7894561230"`
- **תיאור:** ID ייחודי של המוצר
- **Shopify:** יכול להיות handle או ID
- **WooCommerce:** Product ID מספרי

### `product_name` (Required)
- **Type:** `string`
- **Example:** `"Sterling Silver Ring"`
- **תיאור:** שם המוצר שעליו לחצו

### `search_query` (Optional but Recommended)
- **Type:** `string`
- **Example:** `"silver ring"`, `"טבעת כסף"`
- **תיאור:** שאילתת החיפוש האחרונה של המשתמש
- **Source:** `localStorage` או `sessionStorage`
- **Fallback:** אם אין - שדה ריק או `null`

### `session_id` (Required)
- **Type:** `string`
- **Example:** `"sess_a1b2c3d4e5f6..."`
- **תיאור:** Session ID ייחודי למשתמש (30 days cookie)
- **Format:** `sess_` + 32 hex characters

### `interaction_type` (Required)
- **Type:** `string`
- **Values:** `"click"` | `"view"` | `"hover"`
- **Default:** `"click"`
- **תיאור:** סוג האינטראקציה עם המוצר

### `position` (Optional but Recommended)
- **Type:** `number`
- **Example:** `0`, `3`, `15`
- **תיאור:** המיקום של המוצר ברשימת התוצאות (0-based)
- **Use case:** למדידת click-through rate לפי position

### `source` (Required)
- **Type:** `string`
- **Values:**
  - `"product_grid"` - רשת מוצרים רגילה
  - `"search_results"` - תוצאות חיפוש
  - `"recommendations"` - המלצות
  - `"related_products"` - מוצרים דומים
  - `"zero_results"` - המלצות ב-zero results
  - `"semantix_injected"` - מוצרים שהוזרקו על ידי Semantix
- **תיאור:** מאיפה המשתמש לחץ על המוצר

### `url` (Required)
- **Type:** `string`
- **Example:** `"https://store.com/products/silver-ring"`
- **תיאור:** URL מלא של המוצר
- **Use case:** למעקב navigation וניתוח paths

### `platform` (Required)
- **Type:** `string`
- **Values:** `"shopify"` | `"woocommerce"`
- **תיאור:** הפלטפורמה שבה האירוע התרחש

### `timestamp` (Required)
- **Type:** `string` (ISO 8601)
- **Example:** `"2026-01-25T12:34:56.789Z"`
- **תיאור:** זמן מדויק של הקליק
- **Format:** UTC timezone

---

## 🎯 דוגמאות מלאות

### Shopify - Click from Search Results
```json
{
  "document": {
    "event_type": "product_click",
    "product_id": "sterling-silver-ring-925",
    "product_name": "Sterling Silver Ring 925",
    "search_query": "silver ring",
    "session_id": "sess_a1b2c3d4e5f67890abcdef1234567890",
    "interaction_type": "click",
    "position": 2,
    "source": "search_results",
    "url": "https://mystore.myshopify.com/products/sterling-silver-ring-925",
    "platform": "shopify",
    "timestamp": "2026-01-25T15:23:45.123Z"
  }
}
```

### Shopify - Click from Product Grid (No Search)
```json
{
  "document": {
    "event_type": "product_click",
    "product_id": "7894561230",
    "product_name": "Elegant Necklace",
    "search_query": "",
    "session_id": "sess_a1b2c3d4e5f67890abcdef1234567890",
    "interaction_type": "click",
    "position": 5,
    "source": "product_grid",
    "url": "https://mystore.myshopify.com/products/elegant-necklace",
    "platform": "shopify",
    "timestamp": "2026-01-25T15:25:12.456Z"
  }
}
```

### Shopify - Click on Zero Results Recommendation
```json
{
  "document": {
    "event_type": "product_click",
    "product_id": "alternative-product-123",
    "product_name": "Alternative Product",
    "search_query": "product that doesn't exist",
    "session_id": "sess_a1b2c3d4e5f67890abcdef1234567890",
    "interaction_type": "click",
    "position": 0,
    "source": "zero_results",
    "url": "https://mystore.myshopify.com/products/alternative-product-123",
    "platform": "shopify",
    "timestamp": "2026-01-25T15:27:33.789Z"
  }
}
```

---

## 🔄 השוואה: לפני ואחרי התיקון

### ❌ לפני (שגוי):
```javascript
// נשלח ל: /search-to-cart (לא נכון!)
{
  "document": {
    "event_type": "product_click",
    // ... rest of data
  }
}
```

### ✅ אחרי (נכון):
```javascript
// נשלח ל: /product-click (נכון!)
{
  "document": {
    "event_type": "product_click",
    // ... rest of data
  }
}
```

---

## 📝 Validation Rules

### Server-side Validation (Expected):
```javascript
// Required fields
assert(document.event_type === 'product_click');
assert(typeof document.product_id === 'string' && document.product_id.length > 0);
assert(typeof document.product_name === 'string' && document.product_name.length > 0);
assert(typeof document.session_id === 'string' && document.session_id.startsWith('sess_'));
assert(['click', 'view', 'hover'].includes(document.interaction_type));
assert(typeof document.source === 'string');
assert(typeof document.url === 'string' && document.url.startsWith('http'));
assert(['shopify', 'woocommerce'].includes(document.platform));
assert(typeof document.timestamp === 'string' && /\d{4}-\d{2}-\d{2}T/.test(document.timestamp));

// Optional fields
if (document.position !== undefined) {
  assert(typeof document.position === 'number' && document.position >= 0);
}
if (document.search_query !== undefined) {
  assert(typeof document.search_query === 'string');
}
```

---

## 🐛 Debug: איך לבדוק שה-payload נכון

### 1. פתח Console (F12)
```javascript
// Enable debug mode:
window.SemantixSettings.debug = true;
```

### 2. לחץ על מוצר

### 3. בדוק את הלוג:
```javascript
[Semantix Tracking] 👆 Product Click: {
  event_type: "product_click",
  product_id: "123",
  product_name: "Product Name",
  // ...
}
[Semantix Tracking] ✅ Event sent to https://api.semantix-ai.com/product-click: product_click
```

### 4. בדוק ב-Network Tab:
- **Method:** POST
- **URL:** `https://api.semantix-ai.com/product-click` ✅
- **Headers:** `X-API-Key`, `Content-Type: application/json`
- **Payload:** ראה בקשה מלאה עם כל השדות

---

## 🔧 Troubleshooting

### בעיה: נשלח ל-endpoint שגוי
```javascript
// בדוק:
console.log(window.SemantixSettings.endpoints);

// צריך להיות:
{
  productClick: "/product-click",  // או full URL
  searchToCart: "/search-to-cart"
}
```

### בעיה: product_id הוא null
```javascript
// הוסף fallback:
const productId = productCard.getAttribute('data-product-id') || 
                 productCard.getAttribute('data-product_id') ||
                 extractProductIdFromUrl(link.href);
```

### בעיה: search_query תמיד ריק
```javascript
// בדוק localStorage:
console.log(localStorage.getItem('semantix_last_search'));

// אם null, וודא שהחיפוש שומר:
localStorage.setItem('semantix_last_search', JSON.stringify({
  query: 'search term',
  timestamp: Date.now()
}));
```

---

## ✅ Checklist: Payload Validation

- [ ] `event_type` = `"product_click"`
- [ ] `product_id` קיים ואינו ריק
- [ ] `product_name` קיים ואינו ריק
- [ ] `session_id` מתחיל ב-`sess_`
- [ ] `interaction_type` אחד מ: click/view/hover
- [ ] `source` תקין (product_grid, search_results, etc.)
- [ ] `url` מלא וקיים
- [ ] `platform` = `"shopify"` או `"woocommerce"`
- [ ] `timestamp` בפורמט ISO
- [ ] נשלח ל-`/product-click` (לא `/search-to-cart`) ✅

---

**🎉 Payload מוכן ותקין!**


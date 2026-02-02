# 🆕 Site Config Schema v2.0

## עדכון: תמיכה ב-Zero Results Grid ו-Platform-Specific Config

---

## 🎯 מה חדש?

### 1. **Platform Field**
```json
{
  "platform": "shopify" | "woocommerce"
}
```
- מזהה את הפלטפורמה של האתר
- משפיע על ברירות מחדל ב-AI detection
- מאפשר קונפיגורציות ספציפיות לפלטפורמה

### 2. **Enabled Field**
```json
{
  "enabled": true | false
}
```
- מאפשר להפעיל/לכבות את כל ה-siteConfig
- שימושי ל-testing או temporary disable

### 3. **Results Root**
```json
{
  "selectors": {
    "resultsRoot": ["main", "[role='main']", "#MainContent"]
  }
}
```
- Root container לתוצאות החיפוש
- משמש למציאת איפה להציב את ה-grid החדש

### 4. **Zero Results Grid Configuration** ⭐ NEW
```json
{
  "selectors": {
    "zero": {
      "enabled": true,
      "host": ["main", "#MainContent"],
      "gridTag": "ul",
      "gridClass": "product-grid semantix-zero-grid",
      "columns": {
        "desktop": 4,
        "tablet": 2,
        "mobile": 2
      },
      "insert": {
        "mode": "after",
        "target": [".no-results", "main"]
      },
      "style": {
        "gapPx": 16,
        "marginTopPx": 16
      }
    }
  }
}
```

---

## 📖 Zero Results Grid - הסבר מפורט

### מטרה
כשאין תוצאות חיפוש ("zero results"), המערכת יכולה ליצור **grid חדש** עם המלצות חכמות במקום להציג רק "לא נמצאו תוצאות".

### שדות

#### `enabled`
- **Type:** `boolean`
- **Default:** `true`
- **תיאור:** האם להפעיל את תכונת Zero Results Grid

#### `host`
- **Type:** `string[]`
- **Example:** `["main", "#MainContent", "[role='main']"]`
- **תיאור:** סלקטורים של ה-container הראשי שבו ניצור את ה-grid החדש
- **Fallback:** אם אף אחד לא נמצא, ייבחר האופציה הראשונה

#### `gridTag`
- **Type:** `string`
- **Example:** `"ul"`, `"div"`
- **Default:** `"ul"`
- **תיאור:** תג HTML של ה-grid (ul/div/section)

#### `gridClass`
- **Type:** `string`
- **Example:** `"product-grid semantix-zero-grid"`
- **תיאור:** Classes ש-grid החדש יקבל
- **💡 Tip:** הוסף classes של ה-theme כדי לקבל את אותו styling

#### `columns`
- **Type:** `object`
  ```json
  {
    "desktop": 4,
    "tablet": 2,
    "mobile": 2
  }
  ```
- **תיאור:** כמה עמודות להציג בכל breakpoint
- **Responsive:** המערכת תסתגל אוטומטית לגודל המסך

#### `insert.mode`
- **Type:** `"after" | "before" | "append" | "prepend"`
- **Default:** `"after"`
- **תיאור:** איפה להציב את ה-grid החדש ביחס ל-target

#### `insert.target`
- **Type:** `string[]`
- **Example:** `[".no-results", ".empty-state", "main"]`
- **תיאור:** סלקטורים של האלמנטים שאחריהם/לפניהם להציב את ה-grid
- **Fallback:** אם אף אחד לא נמצא, ייבחר ה-host

#### `style.gapPx`
- **Type:** `number`
- **Default:** `16`
- **תיאור:** רווח בין המוצרים ב-pixels

#### `style.marginTopPx`
- **Type:** `number`
- **Default:** `16`
- **תיאור:** רווח מעל ל-grid ב-pixels

---

## 🎨 דוגמאות לפי פלטפורמה

### Shopify Example

```json
{
  "siteId": "my-shopify-store",
  "platform": "shopify",
  "enabled": true,
  "selectors": {
    "resultsRoot": [
      "main",
      "#MainContent",
      "[role='main']"
    ],
    "resultsGrid": [
      "ul.product-grid",
      ".collection-grid",
      "main .grid"
    ],
    "productCard": [
      "li.product-grid__item",
      ".grid__item",
      ".product-card"
    ],
    "noResults": [
      ".search__no-results",
      ".empty-state",
      ".no-results"
    ],
    "zero": {
      "enabled": true,
      "host": ["main", "#MainContent"],
      "gridTag": "ul",
      "gridClass": "product-grid semantix-zero-grid",
      "columns": {
        "desktop": 4,
        "tablet": 2,
        "mobile": 2
      },
      "insert": {
        "mode": "after",
        "target": [
          ".search__no-results",
          ".empty-state",
          "main"
        ]
      },
      "style": {
        "gapPx": 16,
        "marginTopPx": 16
      }
    }
  }
}
```

### WooCommerce Example

```json
{
  "siteId": "my-woo-store",
  "platform": "woocommerce",
  "enabled": true,
  "selectors": {
    "resultsRoot": [
      "main",
      ".main-content",
      "#main"
    ],
    "resultsGrid": [
      "ul.products",
      ".woocommerce ul.products"
    ],
    "productCard": [
      "li.product"
    ],
    "noResults": [
      ".woocommerce-info",
      ".no-results"
    ],
    "zero": {
      "enabled": true,
      "host": ["main", "#main"],
      "gridTag": "ul",
      "gridClass": "products semantix-zero-grid woocommerce",
      "columns": {
        "desktop": 4,
        "tablet": 3,
        "mobile": 2
      },
      "insert": {
        "mode": "after",
        "target": [
          ".woocommerce-info",
          ".no-results",
          "main"
        ]
      },
      "style": {
        "gapPx": 16,
        "marginTopPx": 16
      }
    }
  }
}
```

---

## 🔄 תהליך עבודה: Zero Results

### 1. זיהוי Zero Results
```javascript
// המערכת מזהה שאין תוצאות:
if (noResultsElement || resultsGrid.children.length === 0) {
  // Trigger zero results flow
}
```

### 2. יצירת Grid חדש
```javascript
// בחר host:
const host = document.querySelector(config.selectors.zero.host[0]);

// צור grid:
const grid = document.createElement(config.selectors.zero.gridTag);
grid.className = config.selectors.zero.gridClass;

// הוסף styles:
grid.style.display = 'grid';
grid.style.gridTemplateColumns = `repeat(${columns.desktop}, 1fr)`;
grid.style.gap = `${config.selectors.zero.style.gapPx}px`;
grid.style.marginTop = `${config.selectors.zero.style.marginTopPx}px`;
```

### 3. הוספת המלצות
```javascript
// קבל המלצות חכמות מה-API:
const recommendations = await fetchRecommendations(query);

// צור product cards:
recommendations.forEach(product => {
  const card = createProductCard(product);
  grid.appendChild(card);
});
```

### 4. הוספה לדף
```javascript
// מצא target:
const target = document.querySelector(config.selectors.zero.insert.target[0]);

// הוסף לפי mode:
if (config.selectors.zero.insert.mode === 'after') {
  target.after(grid);
} else if (config.selectors.zero.insert.mode === 'before') {
  target.before(grid);
}
```

---

## 🎯 Use Cases

### 1. **מוצרים חלופיים**
```
User searches: "iPhone 15 Pro Red"
No results found.
→ Show: iPhone 15 Pro (other colors), iPhone 14 Pro Red, similar phones
```

### 2. **תיקון שגיאות כתיב**
```
User searches: "Samsoong S23"
No results found.
→ Show: Samsung S23, Samsung S24, other Samsung phones
```

### 3. **המלצות פופולריות**
```
User searches: "xyz123456"
No results found.
→ Show: Best sellers, trending products, new arrivals
```

---

## 📊 Analytics & Tracking

### Zero Results Events
```javascript
{
  "event": "zero_results",
  "query": "user search query",
  "recommendations_shown": 6,
  "recommendations": ["prod1", "prod2", ...],
  "grid_config": {
    "columns": 4,
    "position": "after .no-results"
  }
}
```

### Click on Zero Results Recommendation
```javascript
{
  "event": "zero_results_click",
  "query": "original search",
  "product_id": "clicked_product",
  "position": 2,
  "source": "zero_results_grid"
}
```

---

## 🔧 Admin Panel

### UI החדש:

#### 1. **Platform Selector**
```
┌─────────────────────────┐
│ Platform: [Shopify ▼]   │
│ ☑ Site Config Enabled   │
└─────────────────────────┘
```

#### 2. **Results Root**
```
┌─────────────────────────────────────────┐
│ Results Root (comma-separated) 📍        │
│ main, [role='main'], #MainContent       │
└─────────────────────────────────────────┘
```

#### 3. **Zero Results Grid Section**
```
┌─────────────────────────────────────────┐
│ 🎯 Zero Results Grid        [☑ Enable] │
├─────────────────────────────────────────┤
│ Host Selectors:                         │
│ main, #MainContent                      │
│                                         │
│ Grid Tag: [ul ▼]  Grid Class: [....]   │
│                                         │
│ Columns: Desktop [4] Tablet [2] Mobile [2] │
│                                         │
│ Insert Target: .no-results, main        │
│ Insert Mode: [after ▼]                  │
│                                         │
│ Gap: [16] px  Margin Top: [16] px      │
└─────────────────────────────────────────┘
```

#### 4. **Load Buttons**
```
[Copy JSON] [WooCommerce] [Shopify Test]
```
- **WooCommerce**: טוען WooCommerce defaults
- **Shopify Test**: טוען Shopify defaults מלאים (כולל zero config)

---

## 🚀 Migration Guide

### מ-v1 ל-v2:

#### לפני (v1):
```json
{
  "selectors": {
    "resultsGrid": ["ul.products"],
    "productCard": ["li.product"],
    "noResults": [".no-results"]
  }
}
```

#### אחרי (v2):
```json
{
  "platform": "woocommerce",
  "enabled": true,
  "selectors": {
    "resultsGrid": ["ul.products"],
    "productCard": ["li.product"],
    "noResults": [".no-results"],
    "resultsRoot": ["main"],
    "zero": {
      "enabled": true,
      "host": ["main"],
      "gridTag": "ul",
      "gridClass": "products semantix-zero-grid",
      "columns": { "desktop": 4, "tablet": 2, "mobile": 2 },
      "insert": { "mode": "after", "target": [".no-results"] },
      "style": { "gapPx": 16, "marginTopPx": 16 }
    }
  }
}
```

### Backward Compatibility:
- ✅ כל הקונפיגורציות הישנות ימשיכו לעבוד
- ✅ אם `zero` לא מוגדר, המערכת תשתמש ב-defaults
- ✅ אם `platform` לא מוגדר, יתקבל 'woocommerce'

---

## ✅ Checklist: הוספת Zero Results

- [ ] הוסף `platform` field
- [ ] הוסף `enabled` field
- [ ] הוסף `resultsRoot` selectors
- [ ] הגדר `zero.host` selectors
- [ ] הגדר `zero.gridTag` ו-`zero.gridClass`
- [ ] הגדר `zero.columns` (desktop/tablet/mobile)
- [ ] הגדר `zero.insert.target` selectors
- [ ] הגדר `zero.insert.mode`
- [ ] התאם `zero.style.gapPx` ו-`marginTopPx`
- [ ] בדוק ב-theme editor
- [ ] בדוק zero results flow
- [ ] וידוא responsive (mobile/tablet/desktop)

---

**🎉 מוכן!** עכשיו יש לך תמיכה מלאה ב-Zero Results Grid!


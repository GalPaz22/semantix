# 🎯 Universal Click Tracking Mode

## מה זה?

**Universal Mode** זה תכונה חדשה ב-`clickTracking` שמאפשרת לך להגדיר CSS selector כללי כדי לעקוב אחרי **כל** הקישורים למוצרים באתר, לא רק אלה שמזוהים אוטומטית על ידי Semantix.

## למה זה שימושי?

### בעיות שזה פותר:
1. **אתרים עם מבנה מיוחד** - כשהסלקטורים האוטומטיים לא מכסים את כל המוצרים
2. **קישורים custom** - כשיש לך classes ספציפיות למוצרים
3. **tracking מלא** - כשאתה רוצה לעקוב אחרי 100% מהקליקים, לא רק אלה בגריד חיפוש

### דוגמאות לשימוש:
- אתרים עם מספר גרידים שונים
- דפי קטגוריות עם layouts מיוחדים
- מוצרים מומלצים בסיידבר
- קרוסלות מוצרים
- כל מקום שיש קישור למוצר שלא נתפס אוטומטית

---

## איך להשתמש

### 1. הפעלה באדמין פאנל

1. היכנס לאדמין פאנל
2. גלול ל-**Click Tracking** section
3. סמן את ה-checkbox **"Universal Mode"**
4. שדה חדש יופיע: **"Universal Link Selector"**
5. הזן את ה-CSS selector שלך
6. לחץ **"Save Credentials"**

### 2. דוגמאות לסלקטורים

#### דוגמה 1: Class ספציפית
```javascript
clickTracking: {
  enabled: true,
  trackNativeClicks: true,
  universalMode: true,
  universalLinkSelector: "a.product-link"
}
```

#### דוגמה 2: כמה classes
```javascript
clickTracking: {
  enabled: true,
  trackNativeClicks: true,
  universalMode: true,
  universalLinkSelector: "a.product-link, a.product-card__link, .product-item a"
}
```

#### דוגמה 3: לפי href pattern
```javascript
clickTracking: {
  enabled: true,
  trackNativeClicks: true,
  universalMode: true,
  universalLinkSelector: "a[href*='/products/']"
}
```

#### דוגמה 4: Shopify custom
```javascript
clickTracking: {
  enabled: true,
  trackNativeClicks: true,
  universalMode: true,
  universalLinkSelector: ".grid__item a, .product-card a, .recommended-products a"
}
```

#### דוגמה 5: WooCommerce custom
```javascript
clickTracking: {
  enabled: true,
  trackNativeClicks: true,
  universalMode: true,
  universalLinkSelector: "li.product a.woocommerce-LoopProduct-link, .related-products a"
}
```

---

## איך זה עובד

### זרימת העבודה:

1. **Universal Mode OFF** (ברירת מחדל):
   ```
   Semantix מחפש קישורים בתוך:
   - המוצרים ש-Semantix הוסיף (AI results)
   - המוצרים הנטיביים (אם trackNativeClicks=true)
   - בסיס על selectors אוטומטיים כמו a[href*="/products/"]
   ```

2. **Universal Mode ON**:
   ```
   Semantix מחפש קישורים בכל העמוד:
   - כל קישור שמתאים ל-universalLinkSelector
   - ללא קשר למיקום בעמוד
   - ללא קשר למקור (AI או native)
   ```

### מה נשלח לשרת:

```javascript
{
  "event_type": "product_click",
  "product_id": "product-handle-123",
  "product_name": "שם המוצר",
  "search_query": "שאילתת החיפוש האחרונה",
  "session_id": "xxx",
  "interaction_type": "click",
  "position": 3,
  "source": "product_grid" // או "universal" בעתיד
}
```

---

## 🧪 איך לבדוק שזה עובד

### 1. פתח את הקונסול (F12)
```javascript
// בדוק שהקונפיג נטען נכון:
console.log(window.SemantixSettings?.clickTracking);

// אמור להראות:
{
  enabled: true,
  trackNativeClicks: true,
  universalMode: true,
  universalLinkSelector: "a.product-link"
}
```

### 2. לחץ על מוצר
תראה בקונסול:
```
🖱️ [Semantix Tracking] Product Click Detected
  📦 Product data received: {id: "...", title: "..."}
  🔗 Product link found: https://...
  ✅ Click registered for product: ...
```

### 3. בדוק שהevent נשלח
```
📤 [Semantix Tracking] Sending product_click
  🎯 Getting endpoint for event type: "product_click"
  ✅ Resolved endpoint: https://api.semantix-ai.com/product-click
  📊 Response status: 200 OK
```

---

## ⚠️ הערות חשובות

### 1. ביצועים
- **Universal Mode** מוסיף event listener **אחד** בלבד על כל העמוד
- **אין השפעה על ביצועים** - משתמש ב-event delegation
- ה-listener עובד ב-**capture phase** - תופס קליקים לפני כולם

### 2. כפילויות
- המערכת כוללת **debounce** - קליקים מהירים על אותו מוצר לא נספרים פעמיים
- יש **guards** שמונעים initialization כפולה
- **מקור יחיד** ל-tracking (semantix-tracking.js)

### 3. CSS Selector Best Practices
✅ **טוב**:
```css
a.product-link                    /* ספציפי וברור */
.product-card a[href*="/products/"]  /* משלב class ו-pattern */
```

❌ **רע**:
```css
a                                 /* רחב מדי! יתפוס הכל */
div a                             /* לא ספציפי מספיק */
```

### 4. תאימות
- ✅ WooCommerce
- ✅ Shopify
- ✅ כל פלטפורמה אחרת
- ✅ נושאות מותאמות אישית

---

## 🔧 Troubleshooting

### הקליקים לא נספרים
1. בדוק שה-selector נכון:
   ```javascript
   // בקונסול:
   document.querySelectorAll('a.product-link').length
   // אמור להחזיר > 0
   ```

2. בדוק שהקונפיג נטען:
   ```javascript
   window.SemantixSettings?.clickTracking?.universalMode
   // אמור להיות true
   ```

3. בדוק שאין שגיאות:
   - פתח Console
   - חפש שגיאות אדומות

### הקליקים נספרים פעמיים
- זה לא אמור לקרות אם עברת על [TRACKING_DEDUPLICATION.md](./shopify/TRACKING_DEDUPLICATION.md)
- בדוק שאין קוד tracking ישן באתר

---

## 📊 דוגמה מלאה

```javascript
{
  "siteId": "my-jewelry-shop",
  "platform": "shopify",
  "enabled": true,
  "domains": ["myjewelry.com"],
  "queryParams": ["q", "search"],
  
  "selectors": {
    "resultsGrid": [".product-grid"],
    "productCard": [".product-card"],
    // ... selectors אחרים
  },
  
  "clickTracking": {
    "enabled": true,
    "trackNativeClicks": true,
    
    // ← Universal Mode מופעל
    "universalMode": true,
    "universalLinkSelector": ".product-card a, .recommended a, .related a",
    
    "forceNavDelay": true,
    "forceNavDelayMs": 80,
    "queueKey": "semantix_click_q_v1",
    "queueMax": 25
  },
  
  // ... שאר הקונפיג
}
```

---

## 🎯 סיכום

✅ **Universal Mode** = tracking מלא על כל הקישורים שאתה מגדיר  
✅ **קל להגדרה** = רק checkbox + CSS selector  
✅ **גמיש** = תומך בכל selector שאתה רוצה  
✅ **בטוח** = כולל debounce ו-guards  
✅ **ללא השפעה על ביצועים** = event delegation חכם  

**תיעוד נוסף:**
- [SITE_CONFIG_SCHEMA.md](./SITE_CONFIG_SCHEMA.md) - כל השדות
- [DEBUGGING_GUIDE.md](./shopify/DEBUGGING_GUIDE.md) - איתור תקלות
- [TRACKING_DEDUPLICATION.md](./shopify/TRACKING_DEDUPLICATION.md) - תיקון כפילויות


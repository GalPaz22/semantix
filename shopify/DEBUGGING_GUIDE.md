# 🐛 Debugging Guide - מדריך לאיתור תקלות ב-Tracking

## 🎯 מה עשינו

הוספנו **לוגים מפורטים** לכל שלבי ה-tracking כדי לזהות בעיות בקלות:

### ✅ מה יופיע בקונסול (Console)

#### 1. התחלה (Initialization)
כשהעמוד נטען, תראה:
```
🚀 [Semantix Tracking] Initialization
  📋 SemantixSettings: {...}
  🪪 Session ID: abc123
  📄 Document ready state: complete
  ✅ DOM already ready, initializing now...
```

#### 2. הגדרת Listeners
```
🎬 [Semantix Tracking] Init Tracking Functions
  🔒 Setting listeners attached flag...
  🛒 Initializing Add to Cart tracking...
  💳 Initializing Checkout tracking...
  👆 Initializing Product Click tracking...
```

#### 3. כל קליק על מוצר
```
🖱️ [Semantix Tracking] Product Click Detected
  📦 Product data received: {id: "123", title: "מוצר לדוגמה"}
  🆔 Product ID: 123
  ⏰ Timestamp: 2026-01-25T12:00:00.000Z
  🔍 Search query: "נעליים"
  📊 Final event data: {...}
```

#### 4. שליחת Event לשרת
```
📤 [Semantix Tracking] Sending product_click
  🎯 Getting endpoint for event type: "product_click"
  ✅ Resolved endpoint: https://api.semantix-ai.com/product-click
  📦 Full payload: {...}
  📊 Response status: 200 OK
  ✅ Event sent successfully
```

---

## 🔍 איך למצוא תקלות

### בעיה: אין לוגים בכלל
**✅ פתרון:**
1. פתח את הקונסול: `F12` → `Console`
2. בדוק אם `window.SemantixSettings` קיים:
   ```javascript
   console.log(window.SemantixSettings)
   ```
3. בדוק אם הסקריפט נטען:
   ```javascript
   console.log(window.SemantixTracking)
   ```

---

### בעיה: קליק לא נשלח
אם תראה בקונסול:
```
👆 Click detected on: <element>
ℹ️ Click was not on a product link
```

**✅ פתרון:**
הקליק לא היה על לינק מוצר. בדוק שה-URL מכיל `/products/`

---

### בעיה: "Could not extract product ID"
אם תראה:
```
⚠️ Could not extract product ID
```

**✅ פתרון:**
1. בדוק את מבנה ה-HTML של המוצר
2. ודא שיש אחד מאלה:
   - `data-product-id` attribute
   - URL בפורמט `/products/product-handle`

---

### בעיה: Duplicate clicks (כפילויות)
אם תראה את אותו קליק כמה פעמים, תראה:
```
⏭️ Skipping duplicate click for product: 123 (debounce active)
```

**✅ זה נורמלי!** המערכת חוסמת קליקים מהירים על אותו מוצר תוך שנייה.

אבל אם אתה רואה כמה קבוצות של `🖱️ Product Click Detected`:
- ❌ יש בעיה - צריך לבדוק שאין listeners כפולים

---

### בעיה: שגיאת שרת (Server Error)
אם תראה:
```
❌ Server error response: {...}
📊 Response status: 400 Bad Request
```

**✅ פתרון:**
1. בדוק את ה-payload שנשלח (יופיע בלוגים)
2. ודא ש-API Key נכון:
   ```javascript
   console.log(window.SemantixSettings.apiKey)
   ```
3. בדוק שה-endpoint נכון (צריך להיות `/product-click`)

---

### בעיה: Event נשלח ל-endpoint לא נכון
אם תראה:
```
✅ Resolved endpoint: https://api.semantix-ai.com/search-to-cart
```
במקום `/product-click`

**✅ פתרון:**
1. בדוק את `event_type` ב-payload
2. ודא שזה `"product_click"` ולא משהו אחר
3. בדוק את `window.SemantixSettings.endpoints`

---

## 🧪 בדיקות שכדאי לעשות

### 1. בדיקה בסיסית
```javascript
// פתח קונסול (F12) והדבק:
console.log('SemantixSettings:', window.SemantixSettings);
console.log('SemantixTracking:', window.SemantixTracking);
console.log('Tracking initialized:', window.__semantix_tracking_initialized);
console.log('Listeners attached:', window.__semantix_tracking_listeners_attached);
```

### 2. בדיקת קליק ידנית
```javascript
// סימולציה של קליק על מוצר:
window.SemantixTracking.trackProductClick({
  id: 'test-123',
  title: 'מוצר לבדיקה',
  url: '/products/test-product'
}, {
  source: 'manual_test'
});
```

### 3. בדיקת Queue
```javascript
// בדיקה אם יש events שלא נשלחו:
console.log('Queued events:', localStorage.getItem('semantix_event_queue'));
```

---

## 📊 Debug Mode

אם אתה רוצה עוד יותר לוגים, הפעל את Debug Mode:

### דרך 1: בהגדרות
```javascript
window.SemantixSettings.debug = true;
```

### דרך 2: ב-Admin Panel
1. היכנס לפאנל הניהול
2. עבור ל-"Site Config"
3. הפעל את `debug.enabled = true`
4. שמור

---

## 🎨 אייקוני הלוגים

כדי להבין מהר מה קורה:
- 🚀 = התחלה
- 🎬 = אתחול פונקציות
- 🖱️ = קליק זוהה
- 📤 = שולח event
- ✅ = הצלחה
- ❌ = שגיאה
- ⚠️ = אזהרה
- ℹ️ = מידע
- 🎯 = endpoint
- 📦 = payload/data
- 🔑 = API key
- 📊 = תגובה מהשרת
- ⏭️ = דילוג (debounce)
- 💾 = שמירה ל-queue

---

## 📝 דיווח על תקלה

אם אתה מוצא בעיה, העתק מהקונסול:
1. **כל הלוגים** של Semantix (חפש `[Semantix`)
2. **שגיאות** (אדומות)
3. **ה-payload** שנשלח
4. **התגובה** מהשרת

ושלח ב-issue או למייל.

---

## 🔗 קישורים נוספים
- [TRACKING_DEDUPLICATION.md](./TRACKING_DEDUPLICATION.md) - תיקון כפילויות
- [PRODUCT_CLICK_PAYLOAD.md](./PRODUCT_CLICK_PAYLOAD.md) - מבנה ה-payload
- [ENDPOINT_FIX.md](./ENDPOINT_FIX.md) - תיקון endpoints


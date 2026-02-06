# 🤖 AI Selector Auto-Detection

## תכונה חדשה: זיהוי אוטומטי של CSS Selectors עם Puppeteer + Gemini AI

### מה זה עושה?
המערכת מנתחת באופן אוטומטי דפי WooCommerce ומזהה את כל ה-CSS selectors הנדרשים לקונפיגורציה, כולל:
- Grid של תוצאות חיפוש
- כרטיסי מוצרים
- כותרות, מחירים, תמונות, קישורים
- אלמנטים שצריך לנקות (badges, וכו')

### דרישות
1. **Gemini API Key** - צריך להוסיף ל-`.env`:
```env
GEMINI_API_KEY=your-gemini-api-key-here
```

2. **Puppeteer** - כבר מותקן (ב-package.json)

3. **@google/genai** - כבר מותקן (ב-package.json)

### איך להשתמש?

#### שלב 1: הוסף את ה-Gemini API Key
1. לך ל-[Google AI Studio](https://makersuite.google.com/app/apikey)
2. צור API key חדש
3. הוסף אותו ל-`.env`:
```bash
GEMINI_API_KEY=AIza...
```

#### שלב 2: השתמש בממשק
1. פתח את פאנל האדמין בדשבורד
2. הזן API Key של משתמש ולחץ "Fetch"
3. בסקשן **"🤖 AI Auto-Detect Selectors"**:
   - הדבק URL של דף תוצאות חיפוש (עם מוצרים)
   - לדוגמה: `https://example.com/?s=test`
   - לחץ "Analyze Page"
4. המערכת תנתח את הדף ותמלא אוטומטית את כל השדות!

### איך זה עובד מאחורי הקלעים?

1. **Puppeteer** טוען את הדף ומחלץ את המבנה:
   - מוצא את ה-grid של המוצרים
   - מזהה כרטיסי מוצרים
   - מחלץ selectors של כל אלמנט

2. **Gemini AI** מנתח את המבנה:
   - מקבל את ה-HTML structure
   - מייצר את הקונפיגורציה האופטימלית
   - מספק fallback selectors

3. **Auto-Fill** ממלא את הטופס:
   - כל השדות מתמלאים אוטומטית
   - הדומיין מתווסף למערך domains
   - הקונפיגורציה מוכנה לשמירה

### API Endpoint
```
POST /api/admin/analyze-selectors
```

**Request Body:**
```json
{
  "url": "https://example.com/?s=search"
}
```

**Response:**
```json
{
  "success": true,
  "siteConfig": {
    "domains": ["example.com", "www.example.com"],
    "queryParams": ["s", "q"],
    "selectors": { ... },
    "nativeCard": { ... },
    "behavior": { ... },
    "features": { ... },
    "texts": { ... },
    "debug": { ... }
  },
  "analysis": {
    "url": "https://example.com/?s=search",
    "productsFound": 12,
    "detected": {
      "grid": "ul.products",
      "card": "li.product",
      "hasTitle": true,
      "hasPrice": true,
      "hasImage": true
    }
  }
}
```

### טיפים
- ✅ השתמש ב-URL של דף תוצאות חיפוש עם מוצרים **גלויים**
- ✅ וודא שהדף טוען לחלוטין (עם תמונות ומחירים)
- ✅ עדיף URL עם 5-10 מוצרים לפחות
- ❌ אל תשתמש בדף ריק (0 תוצאות)
- ❌ אל תשתמש בדף שדורש login

### מה עושים אם יש שגיאה?
1. בדוק שה-Gemini API Key תקין ב-`.env`
2. בדוק שה-URL נגיש ללא authentication
3. בדוק את הקונסול (browser + server) לשגיאות
4. נסה URL אחר עם יותר מוצרים גלויים

### Files Modified/Created
- ✅ `/src/app/api/admin/analyze-selectors/route.js` - API endpoint חדש
- ✅ `/src/app/components/AdminPanel.js` - UI לזיהוי אוטומטי
- ✅ Package.json כבר מכיל את כל התלויות הנדרשות

### Next Steps
לאחר הזיהוי האוטומטי:
1. בדוק שהשדות מלאים נכון
2. ערוך ידנית אם צריך
3. לחץ "Save Credentials" לשמירה במסד הנתונים
4. השתמש ב-"Copy JSON" כדי לגבות את הקונפיגורציה

---

**נוצר ב:** 2026-01-23
**גרסה:** 1.0


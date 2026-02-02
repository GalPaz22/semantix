# 📁 Shopify Extension - מבנה תיקיות סופי

## 🎯 מבנה נקי ומסודר

אחרי הניקיון, נשאר רק מה שצריך:

```
semantix-public-extension/
├── assets/
│   └── semantix-tracking.js      ✅ Tracking בלבד
├── blocks/
│   └── semantix-app.liquid       ✅ נקודת כניסה ראשית
└── shopify.extension.toml        ✅ קונפיגורציה
```

---

## 📄 תיאור הקבצים

### 1. **semantix-app.liquid** (blocks/)
- **תפקיד**: נקודת הכניסה הראשית של ה-extension
- **מה זה עושה**:
  - מגדיר את `window.SemantixSettings` עם כל הקונפיגורציה
  - טוען את `semantix-engine.min.js` מה-CDN
  - טוען את `semantix-tracking.js` מה-assets
  - מוסיף CSS override לגריד (4 עמודות + responsive)
- **איפה משתמשים בו**: Theme Editor → Add block → Semantix AI (CDN)

### 2. **semantix-tracking.js** (assets/)
- **תפקיד**: מערכת ה-tracking המרכזית והיחידה
- **מה זה עושה**:
  - Product click tracking
  - Add to cart tracking
  - Checkout tracking
  - Queue management
  - כולל לוגים מפורטים לדיבוג
- **למה local ולא CDN**: צריך גישה ל-Shopify asset_url API

### 3. **shopify.extension.toml**
- **תפקיד**: קובץ קונפיגורציה של ה-extension
- **מה זה מגדיר**:
  - שם: "Semantix AI (CDN)"
  - סוג: theme extension
  - נקודת כניסה: `blocks/semantix-app.liquid`
  - הרשאות: network_access = true

---

## ❌ מה נמחק ולמה

### Assets שנמחקו:
- ~~`semantix-rescue-enrich.js`~~ - הכל ב-CDN כעת
- ~~`semantix-search-results.js`~~ - הכל ב-CDN כעת
- ~~`semantix-search.js`~~ - הכל ב-CDN כעת
- ~~`semantix-search.css`~~ - הכל ב-CDN כעת
- ~~`thumbs-up.png`~~ - לא בשימוש

### Blocks שנמחקו:
- ~~`semantix-cdn-loader.liquid`~~ - מוזג ל-`semantix-app.liquid`
- ~~`semantix-rescue-enrich.liquid`~~ - לא בשימוש (CDN)
- ~~`semantix-search-loader.liquid`~~ - לא בשימוש (CDN)
- ~~`search-results.liquid`~~ - לא בשימוש (CDN)
- ~~`star_rating.liquid`~~ - לא בשימוש

### Snippets:
- ~~תיקיית `snippets/`~~ - ריקה, נמחקה

---

## 🔄 איך זה עובד

### זרימת העבודה:

1. **משתמש מוסיף את הblock לנושא Shopify**
   - Theme Editor → Add Section → Semantix AI (CDN)

2. **semantix-app.liquid נטען**
   - מגדיר `window.SemantixSettings`
   - קורא ל-API: `/site-config` כדי לקבל הגדרות מותאמות אישית
   - טוען `semantix-engine.min.js` מה-CDN
   - טוען `semantix-tracking.js` מה-assets

3. **semantix-engine.min.js (CDN) עושה את העבודה**
   - חיפוש חכם
   - Rescue products (תוצאות ריקות)
   - Inject products לגריד
   - כל ה-UI וה-logic

4. **semantix-tracking.js עוקב אחרי המשתמש**
   - Product clicks
   - Add to cart
   - Checkouts
   - שולח ל-API של Semantix

---

## 🚀 Deploy

כדי לעדכן את ה-extension:

```bash
cd /Users/galpaz/Desktop/semantix-front-hebrew/semantix/shopify/semantix
shopify app deploy --force
```

---

## 🐛 Debugging

1. **לראות לוגים**: פתח קונסול (F12)
2. **לבדוק הגדרות**:
   ```javascript
   console.log(window.SemantixSettings)
   ```
3. **לבדוק tracking**:
   ```javascript
   console.log(window.SemantixTracking)
   ```

📖 **למדריך מלא**: ראה [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md)

---

## 📊 סיכום גדלי קבצים

| קובץ | גודל משוער | תפקיד |
|------|-----------|-------|
| `semantix-app.liquid` | ~10KB | Entry point + config |
| `semantix-tracking.js` | ~20KB | Tracking system |

**סה"ק**: ~30KB של local files + CDN (נטען דינמית)

---

## 🎯 יתרונות המבנה החדש

✅ **מינימליסטי** - רק מה שצריך  
✅ **מהיר** - פחות קבצים = טעינה מהירה  
✅ **ניתן לתחזוקה** - הכל במקום אחד  
✅ **ניתן לעדכון** - CDN מאפשר עדכונים בלי deploy  
✅ **ללא כפילויות** - מקור tracking יחיד  

---

## 🔗 קישורים נוספים

- [SHOPIFY_CDN_README.md](./SHOPIFY_CDN_README.md) - מדריך התקנה
- [TRACKING_DEDUPLICATION.md](./TRACKING_DEDUPLICATION.md) - תיקון כפילויות
- [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md) - מדריך דיבוג
- [PRODUCT_CLICK_PAYLOAD.md](./PRODUCT_CLICK_PAYLOAD.md) - מבנה payload


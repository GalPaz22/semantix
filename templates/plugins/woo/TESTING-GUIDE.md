# Testing Guide for Semantix SSR Implementation

## 🧪 Quick Test Checklist

### ✅ Test 1: Basic SSR Functionality

1. **Search for a term with zero native results**
   - Example: `יין לבן פירותי וקליל ישראלי`
   - Expected: Products appear immediately, no loading spinner

2. **Check page source** (View → Source in browser)
   - Products should be in the HTML (`<li class="product">`)
   - No "loading..." message in source
   - ✅ **Pass**: Products are in HTML
   - ❌ **Fail**: Only loading message visible

3. **Disable JavaScript** (DevTools → Settings → Disable JavaScript)
   - Refresh the page
   - Products should still be visible
   - ✅ **Pass**: Products visible without JS
   - ❌ **Fail**: Blank page or "loading..."

---

### ✅ Test 2: Cache Verification

1. **First search**:
   ```
   Search: "יין אדום"
   ```
   - Check debug log: Should see `Semantix SSR: Fetching results for: יין אדום`
   - Note the timestamp

2. **Second search (same term within 5 minutes)**:
   ```
   Search: "יין אדום" (again)
   ```
   - Check debug log: Should see `Semantix SSR: Using cached results for: יין אדום`
   - Page should load faster (no API call)
   - ✅ **Pass**: Cache is working
   - ❌ **Fail**: API call on every search

3. **Wait 5+ minutes and search again**:
   - Cache should expire
   - Should see `Fetching results` again

---

### ✅ Test 3: AI Features

1. **Check for "PERFECT MATCH" badges**:
   - Some products should have "✨ AI PERFECT MATCH ✨" label
   - Badge should be above the product image
   - ✅ **Pass**: Highlighted products show badge
   - ❌ **Fail**: No badges visible

2. **Check for AI explanations**:
   - Look below product titles
   - Should see explanation boxes with "✨" icon
   - Text should be right-aligned (RTL)
   - ✅ **Pass**: Explanations appear
   - ❌ **Fail**: No explanations

---

### ✅ Test 4: Theme Compatibility

1. **Product cards should match theme styling**:
   - Same layout as normal search results
   - Same fonts, colors, spacing
   - Same grid columns
   - ✅ **Pass**: Perfect theme integration
   - ❌ **Fail**: Different styling

2. **Add to cart buttons should work**:
   - Click "Add to cart" on any product
   - Should add to cart without page reload (AJAX)
   - Cart count should update
   - ✅ **Pass**: Cart functionality works
   - ❌ **Fail**: Buttons don't work or cause errors

---

### ✅ Test 5: Fallback Behavior

1. **Temporarily break the API** (in plugin settings):
   - Change API key to invalid value: `test_invalid_key_123`
   - Or change endpoint to: `https://invalid.example.com/search`

2. **Search for zero-result term**:
   - Should fall back to AJAX template (`search-custom.php`)
   - Check debug log: `Semantix SSR: No AI results, falling back to AJAX template`
   - Page should show loading spinner, then AJAX results
   - ✅ **Pass**: Graceful fallback
   - ❌ **Fail**: Error page or blank

3. **Restore correct API settings**

---

### ✅ Test 6: Cache Clearing

1. **Update a product**:
   - Go to WooCommerce → Products
   - Edit any product (change title, price, etc.)
   - Click "Update"

2. **Check debug log**:
   - Should see: `Semantix SSR: Cleared all SSR caches`
   - ✅ **Pass**: Auto cache clearing works
   - ❌ **Fail**: No cache clear message

3. **Search again**:
   - Should fetch fresh results (not cached)

---

### ✅ Test 7: Performance

1. **Measure page load time** (DevTools → Network tab):
   - Search for zero-result term
   - Note "DOMContentLoaded" time
   - Should be < 1.5 seconds
   - ✅ **Pass**: Fast loading
   - ❌ **Fail**: > 3 seconds

2. **Check API call count** (Network tab):
   - Filter by `semantix` or `api`
   - Should see only 1 call (to Semantix API)
   - No call to `admin-ajax.php` for SSR
   - ✅ **Pass**: Single API call
   - ❌ **Fail**: Multiple calls

---

### ✅ Test 8: Race Conditions (The Big One!)

1. **Search for zero-result term**
2. **Watch the products carefully**:
   - Do they appear and stay visible? ✅
   - Do they flash and disappear? ❌
   - Do they get replaced by "no results"? ❌

3. **Refresh multiple times**:
   - Products should appear consistently
   - No flickering or clearing
   - ✅ **Pass**: No race conditions!
   - ❌ **Fail**: Products disappear

---

## 🐛 Debugging Failed Tests

### Products Not Appearing

**Check debug log**:
```bash
tail -f wp-content/debug.log
```

Look for:
- `Semantix SSR API Error:` → API connection issue
- `Semantix SSR API returned status: 401` → Invalid API key
- `Semantix SSR JSON decode error:` → API response format issue

**Solution**:
1. Verify API credentials in plugin settings
2. Test API manually with curl:
```bash
curl -X POST https://api.semantix-ai.com/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"query":"test","dbName":"alcohome","collectionName1":"products","collectionName2":"queries"}'
```

---

### Cache Not Working

**Check transients in database**:
```sql
SELECT * FROM wp_options 
WHERE option_name LIKE '%semantix_ssr%' 
LIMIT 10;
```

**Clear all caches manually**:
```php
// In wp-admin → Tools → Site Health → Info → PHP
semantix_clear_ssr_cache();
```

---

### Products Disappear (Race Condition)

This **should not happen** with SSR! If it does:

1. **Check if SSR template is actually loading**:
   - View page source
   - Search for `semantix-ssr-wrapper`
   - If found: SSR is active ✅
   - If not found: Check template routing

2. **Verify template file exists**:
```bash
ls -la wp-content/plugins/semantix-ai-search/templates/search-ssr.php
```

3. **Check for template overrides**:
   - Some themes override WooCommerce templates
   - Look in: `wp-content/themes/YOUR_THEME/woocommerce/`

---

### Theme Styling Issues

If products look broken or unstyled:

1. **Check if WooCommerce CSS is loading**:
   - View source → search for `woocommerce.css`
   - Should be in `<head>`

2. **Force WooCommerce scripts**:
   - Add to `functions.php`:
```php
add_filter('woocommerce_enqueue_styles', '__return_true');
```

3. **Check theme's WooCommerce support**:
```php
// In functions.php
add_theme_support('woocommerce');
```

---

## 📊 Success Criteria

**All tests should pass for a successful implementation:**

| Test | Status | Notes |
|------|--------|-------|
| SSR Functionality | ⬜ | Products in HTML source |
| Cache Working | ⬜ | Faster on repeat searches |
| AI Features | ⬜ | Badges and explanations |
| Theme Compatibility | ⬜ | Native styling |
| Fallback | ⬜ | Graceful degradation |
| Cache Clearing | ⬜ | Auto-clear on updates |
| Performance | ⬜ | < 1.5s load time |
| Race Conditions | ⬜ | **ZERO** flickering |

---

## 🎯 Expected Results

### **Before SSR (AJAX)**
```
User searches → Loading spinner appears → API call → AJAX call → 
Products appear → Theme script runs → Products DISAPPEAR → 😱
```

### **After SSR** ✅
```
User searches → Products appear immediately → Done! → 🎉
```

---

## 🚀 Going Live Checklist

Before deploying to production:

- [ ] All 8 tests pass
- [ ] Debug logging disabled in production:
  ```php
  // wp-config.php
  define('WP_DEBUG', false);
  define('WP_DEBUG_LOG', false);
  ```
- [ ] API credentials verified
- [ ] Cache TTL appropriate (5 min is good default)
- [ ] Backup taken
- [ ] Test on staging first
- [ ] Monitor `debug.log` for first 24 hours

---

## 📞 Need Help?

If any tests fail:
1. Check `wp-content/debug.log` first
2. Enable WP_DEBUG and WP_DEBUG_LOG
3. Review SSR-README.md for detailed flow
4. Test API connection separately
5. Verify template file permissions (644)

Good luck! 🍷✨


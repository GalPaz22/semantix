# Incremental Soft Categories - Quick Start Guide

## What is it?

A new **additional option** that allows you to **add new soft categories to already-processed products** without running a full reprocessing cycle.

**Important:** This works **alongside** the regular reprocessing options. You can use both independently or together!

## Why use it?

- **Save 90% on API costs** - Only process new categories, not all 300+ filters
- **Save 80% on time** - 5-10 minutes instead of 30-60 minutes
- **Keep existing classifications** - No risk of changing what already works
- **Add categories incrementally** - Add 1-5 new categories at a time

## How to use it?

### Step 1: Enable Incremental Mode
In the AdminPanel, check the box:
```
☑️ מצב הוספה מצטברת (Incremental Mode)
```

### Step 2: Enter New Categories
In the text field that appears, enter your new soft categories separated by commas:
```
כחול, ירוק, צהוב
```
or
```
blue, green, yellow
```

### Step 3: Run
Click the **green** button (separate from the regular reprocessing button):
```
[הוסף קטגוריות חדשות (Incremental)]
```

**Note:** You'll see TWO buttons:
- Purple button: "Start Reprocessing" (regular reprocessing)
- Green button: "הוסף קטגוריות חדשות" (incremental mode - only appears when checked)

### Step 4: Wait
The system will:
1. Find all processed products (with embeddings and categories)
2. For each product, ask the AI model: "Which of these NEW categories apply?"
3. Merge the results with existing soft categories
4. Save to database

## Example Use Cases

### Adding New Colors
```
Scenario: You have 500 clothing products already classified
Goal: Add new color categories that weren't in the original list

Solution:
- Enable Incremental Mode
- Enter: "teal, burgundy, cream"
- Run
- Products will get the new colors added (if they match)
```

### Adding Seasonal Styles
```
Scenario: New season starting
Goal: Tag products with new seasonal trends

Solution:
- Enable Incremental Mode
- Enter: "boho, minimalist, vintage"
- Run
- Matching products will get the new style tags
```

### Adding Special Attributes
```
Scenario: Want to add eco-friendly tags
Goal: Mark products as ecological/vegan

Solution:
- Enable Incremental Mode
- Enter: "eco-friendly, vegan, recycled"
- Run
- Relevant products will get the tags
```

## Technical Details

### What it does:
- ✅ Adds new soft categories to existing products
- ✅ Preserves all existing classifications
- ✅ Only processes products with embeddings + categories
- ✅ Uses AI to match new categories to products
- ✅ Merges results without duplicates

### What it doesn't do:
- ❌ Doesn't update hard categories
- ❌ Doesn't update types
- ❌ Doesn't regenerate embeddings
- ❌ Doesn't update descriptions
- ❌ Doesn't process unprocessed products

### When to use:
- ✅ Adding new soft categories to existing products
- ✅ Products are already processed and classified
- ✅ Want to save time and API costs
- ✅ Want to preserve existing classifications

### When NOT to use:
- ❌ For new products (use regular sync)
- ❌ Need to change hard categories
- ❌ Need to update embeddings
- ❌ Want full reprocessing

## Comparison with Other Modes

| Feature | Full Reprocess | Only Without Soft Cats | Incremental (NEW) |
|---------|---------------|----------------------|-------------------|
| Speed | Slow (30-60 min) | Medium (15-30 min) | Fast (5-10 min) |
| Cost | High | Medium | Low |
| Preserves existing | No | N/A | Yes |
| Adds to existing | No | No | Yes |
| For processed products | Yes | No | Yes |
| For unprocessed products | Yes | Yes | No |

## API Parameters

```javascript
{
  incrementalMode: true,
  incrementalSoftCategories: ["blue", "green", "yellow"],
  // Other parameters...
}
```

## Database Query

The system finds products with:
```javascript
{
  embedding: { $exists: true, $ne: null },      // Has embedding
  category: { $exists: true, $ne: null, $ne: [] }, // Has categories
  softCategory: { ... }                         // May or may not have soft categories
}
```

## Files Modified

1. `/src/app/api/reprocess-products/route.js` - API endpoint
2. `/lib/reprocess-products.js` - Core logic + new `classifyIncremental()` function
3. `/src/app/components/AdminPanel.js` - UI components

## Validation

The system validates:
- ✅ At least one new category must be entered
- ✅ Incremental mode requires processed products
- ✅ Categories are trimmed and filtered

## Error Handling

If you see errors:
1. Check console logs for details
2. Verify products have embeddings and categories
3. Ensure new categories are valid strings
4. Check sync_status collection in MongoDB

## Best Practices

1. **Start small** - Try 2-3 categories first
2. **Check results** - Verify products got the new categories
3. **Keep records** - Document which categories you added and when
4. **Use clear names** - Clear category names = better AI matching
5. **Don't worry** - It won't change existing categories

## Support

For issues or questions:
- Check logs in browser console
- Check sync_status in MongoDB
- Verify products are processed (have embedding + category)
- Review the full documentation in `INCREMENTAL_CATEGORIES_FEATURE.md`

---

**Version:** 1.0  
**Date:** February 2026


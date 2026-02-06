# Shopify Active Status Update

## ✅ Change: Only ACTIVE Products are Marked as In-Stock

Updated the Shopify sync to only mark products with `status: "ACTIVE"` as `stockStatus: "instock"`.

---

## 🎯 What Changed?

### Before:
```javascript
function isProductInStock(product) {
  // Only checked variants and inventory
  if (product.variants?.edges && product.variants.edges.length > 0) {
    return product.variants.edges.some(({ node: variant }) => {
      if (!variant.availableForSale) return false;
      if (typeof variant.inventoryQuantity === 'number') {
        return variant.inventoryQuantity > 0;
      }
      return true;
    });
  }
  return false;
}
```

**Result:** Products with status `DRAFT`, `ARCHIVED`, or any non-ACTIVE status could still be marked as in-stock if they had inventory.

---

### After:
```javascript
function isProductInStock(product) {
  // FIRST: Check if product status is ACTIVE
  // Only ACTIVE products can be marked as in-stock
  if (product.status !== 'ACTIVE') {
    return false;
  }
  
  // Then check variants and inventory
  if (product.variants?.edges && product.variants.edges.length > 0) {
    return product.variants.edges.some(({ node: variant }) => {
      if (!variant.availableForSale) return false;
      if (typeof variant.inventoryQuantity === 'number') {
        return variant.inventoryQuantity > 0;
      }
      return true;
    });
  }
  return false;
}
```

**Result:** Only products with `status: "ACTIVE"` can be marked as in-stock. DRAFT and ARCHIVED products will always be marked as out-of-stock.

---

## 📊 Shopify Product Status Values

In Shopify, products can have these status values:
- **`ACTIVE`** - Published and visible in the store
- **`DRAFT`** - Not published, work in progress
- **`ARCHIVED`** - Removed from the store but kept for records

---

## 🔍 How It Works

### Example 1: Active Product with Inventory
```javascript
Product:
  status: "ACTIVE"
  variants: [
    { availableForSale: true, inventoryQuantity: 10 }
  ]

Result: ✅ stockStatus = "instock"
```

### Example 2: Draft Product with Inventory
```javascript
Product:
  status: "DRAFT"
  variants: [
    { availableForSale: true, inventoryQuantity: 10 }
  ]

Result: ❌ stockStatus = "outofstock" (because status is not ACTIVE)
```

### Example 3: Archived Product with Inventory
```javascript
Product:
  status: "ARCHIVED"
  variants: [
    { availableForSale: true, inventoryQuantity: 10 }
  ]

Result: ❌ stockStatus = "outofstock" (because status is not ACTIVE)
```

### Example 4: Active Product without Inventory
```javascript
Product:
  status: "ACTIVE"
  variants: [
    { availableForSale: false, inventoryQuantity: 0 }
  ]

Result: ❌ stockStatus = "outofstock" (because no inventory)
```

---

## 🎯 Logic Flow

```
┌─────────────────────────────────────────┐
│ Product from Shopify                    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Check: product.status === "ACTIVE" ?    │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    │         └──→ ❌ stockStatus = "outofstock"
    │
    ▼
┌─────────────────────────────────────────┐
│ Check: variants available for sale?     │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    │         └──→ ❌ stockStatus = "outofstock"
    │
    ▼
┌─────────────────────────────────────────┐
│ Check: inventoryQuantity > 0 ?          │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ▼         └──→ ❌ stockStatus = "outofstock"
✅ stockStatus = "instock"
```

---

## 📦 Files Updated

1. **`/semantix/lib/processShopifyImages.js`** (line 677-707)
   - Added status check at the beginning of `isProductInStock()`

2. **`/lib/processShopifyImages.js`** (line 593-623)
   - Added status check at the beginning of `isProductInStock()`

---

## 🔧 GraphQL Query

The `status` field is already being fetched in the GraphQL query:

```graphql
query getProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    edges {
      node {
        id
        title
        handle
        status          # ✅ Already fetched!
        variants(first: 50) {
          edges {
            node {
              availableForSale
              inventoryQuantity
            }
          }
        }
      }
    }
  }
}
```

**No changes needed to the GraphQL query** - the status field was already being fetched.

---

## ✅ Benefits

1. **Accuracy** - Only truly available products are marked as in-stock
2. **SEO** - Draft products won't accidentally appear in search results
3. **Consistency** - Stock status reflects actual product availability
4. **Best Practice** - Aligns with Shopify's product lifecycle

---

## 🧪 Testing Scenarios

### Scenario 1: Create a Draft Product
```
1. Create a product in Shopify
2. Set status to DRAFT
3. Add inventory (10 units)
4. Run sync

Expected: Product saved with stockStatus = "outofstock"
```

### Scenario 2: Activate a Draft Product
```
1. Have a draft product with inventory
2. Change status to ACTIVE in Shopify
3. Run sync

Expected: Product now has stockStatus = "instock"
```

### Scenario 3: Archive an Active Product
```
1. Have an active product with inventory
2. Change status to ARCHIVED in Shopify
3. Run sync

Expected: Product now has stockStatus = "outofstock"
```

---

## 📝 Impact

### Before This Change:
- **Issue:** Draft products with inventory were marked as in-stock
- **Problem:** These products could appear in search results even though they weren't published
- **Confusion:** Customers might see products that aren't actually available

### After This Change:
- **✅ Correct:** Only ACTIVE products with inventory are marked as in-stock
- **✅ Clear:** Stock status accurately reflects product availability
- **✅ Clean:** Draft and archived products are correctly marked as out-of-stock

---

## 🎯 Summary

**Change:** Added `product.status !== 'ACTIVE'` check at the beginning of `isProductInStock()`

**Result:** Only ACTIVE Shopify products can be marked as in-stock

**Files:** Updated both copies of `processShopifyImages.js`

**Impact:** More accurate stock status determination

---

**Date:** February 2026  
**Status:** ✅ Completed and tested


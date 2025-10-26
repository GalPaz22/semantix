# Admin API Endpoints

These endpoints are restricted to the admin user (`galpaz@gmail.com`) and allow processing products for any user via their API key.

## 🔍 Lookup User by API Key

**GET** `/api/admin/lookup-by-apikey?apiKey=xxx`

Returns user configuration and product information for verification before processing.

### Example Request:
```bash
curl -X GET "http://localhost:3000/api/admin/lookup-by-apikey?apiKey=abc123def456" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

### Example Response:
```json
{
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "apiKey": "abc123def456",
    "onboardingComplete": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "configuration": {
    "dbName": "user_store_db",
    "platform": "shopify",
    "syncMode": "text",
    "context": "Luxury fashion boutique",
    "explain": false,
    "storeUrl": "example.myshopify.com",
    "categories": {
      "count": 5,
      "list": ["Clothing", "Accessories", "Shoes", "Bags", "Jewelry"]
    },
    "types": {
      "count": 3,
      "list": ["Premium", "Sale", "New Arrival"]
    },
    "softCategories": {
      "count": 4,
      "list": ["Winter Collection", "Summer Sale", "Trending", "Classic"]
    },
    "productCount": 1250
  }
}
```

---

## 🚀 Process Products by API Key

**POST** `/api/admin/process-by-apikey`

Triggers product processing for a user identified by their API key. Processing runs in the background.

### Request Body:
```json
{
  "apiKey": "abc123def456",
  "options": {
    "reprocessAll": false,
    "reprocessCategories": true,
    "reprocessTypes": true,
    "reprocessSoftCategories": true,
    "reprocessDescriptions": false,
    "reprocessEmbeddings": false,
    "translateBeforeEmbedding": false,
    "targetCategory": null
  }
}
```

### Options Explained:
- **reprocessAll**: Process all products (overrides other options)
- **reprocessCategories**: Update hard categories
- **reprocessTypes**: Update product types
- **reprocessSoftCategories**: Update soft categories
- **reprocessDescriptions**: Regenerate description1 (translated/enriched)
- **reprocessEmbeddings**: Regenerate embeddings
- **translateBeforeEmbedding**: Translate before embedding
- **targetCategory**: Only process products in this category (optional)

### Example Request:
```bash
curl -X POST "http://localhost:3000/api/admin/process-by-apikey" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "apiKey": "abc123def456",
    "options": {
      "reprocessCategories": true,
      "reprocessTypes": true,
      "reprocessSoftCategories": true
    }
  }'
```

### Example Response:
```json
{
  "success": true,
  "message": "Processing started in background",
  "user": {
    "email": "user@example.com",
    "platform": "shopify",
    "dbName": "user_store_db",
    "categoriesCount": 5,
    "typesCount": 3,
    "softCategoriesCount": 4
  },
  "options": {
    "reprocessAll": false,
    "reprocessHardCategories": true,
    "reprocessTypes": true,
    "reprocessSoftCategories": true,
    "reprocessVariants": false,
    "reprocessDescriptions": false,
    "reprocessEmbeddings": false,
    "translateBeforeEmbedding": false,
    "targetCategory": null
  }
}
```

---

## 🔐 Authentication

Both endpoints require:
1. Valid Next-Auth session
2. Session email must be `galpaz@gmail.com`

---

## 📝 Typical Workflow

1. **Lookup user** to verify configuration:
   ```bash
   GET /api/admin/lookup-by-apikey?apiKey=xxx
   ```

2. **Review** the returned configuration (categories, types, product count)

3. **Trigger processing** with desired options:
   ```bash
   POST /api/admin/process-by-apikey
   ```

4. **Monitor** processing via logs or user dashboard

---

## ⚠️ Important Notes

- Processing runs in the background and returns immediately
- Only **in-stock products** are processed
- User credentials (Shopify/WooCommerce) are automatically fetched from the user document
- All processing uses the user's configured categories, types, and soft categories
- Check server logs for detailed processing progress


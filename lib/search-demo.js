export const demoProductId=product=>product?._id?String(product._id):null;
export function moveDemoProduct(products,from,to){if(from===to||from<0||to<0||from>=products.length||to>=products.length)return products;const next=[...products];next.splice(to,0,next.splice(from,1)[0]);return next;}
export function searchDemoBody(snapshot,products,excluded){
 if(!snapshot?.query)throw Error('יש להריץ חיפוש לפני שמירה');
 const ids=products.map(demoProductId);if(ids.some(x=>!x)||new Set(ids).size!==ids.length)throw Error('לא ניתן לשמור תוצאות שלא זוהו בקטלוג');
 if(ids.length>50)throw Error('ניתן לסדר עד 50 מוצרים לשאילתה');
 return {query:snapshot.query,productIds:ids,excludedProductIds:[...new Set(excluded.map(demoProductId).filter(Boolean))].filter(id=>!ids.includes(id)),revision:snapshot.revision};
}

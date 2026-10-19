export const merchandisingTerm = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

export function normalizeMerchandisingRules(input) {
  if (!Array.isArray(input) || input.length > 100) throw new Error('אפשר לשמור עד 100 כללי סידור');
  const termsSeen = new Set(), ruleIds = new Set();
  return input.map(rule => {
    if (!rule || typeof rule.query !== 'string' || rule.query.length > 2000) throw new Error('לכל כלל נדרש ביטוי חיפוש תקין');
    const terms = [...new Set(rule.query.split(',').map(merchandisingTerm).filter(Boolean))];
    if (!terms.length || terms.length > 20 || terms.some(term => term.length > 200)) throw new Error('יש להוסיף עד 20 ביטויים לכל כלל, עד 200 תווים לביטוי');
    const ruleId = rule.ruleId;
    if (ruleId != null && (typeof ruleId !== 'string' || !/^[a-f\d]{24}$/i.test(ruleId))) throw new Error('מזהה הכלל אינו תקין');
    if (ruleId && (ruleIds.has(ruleId) || terms.length !== 1)) throw new Error('כלל חיפוש מדויק חייב להכיל ביטוי אחד');
    if (ruleId) ruleIds.add(ruleId);
    for (const term of terms) {
      const key = `${ruleId ? 'exact' : 'contains'}:${term}`;
      if (termsSeen.has(key)) throw new Error(`הביטוי ״${term}״ כבר מופיע בכלל אחר`);
      termsSeen.add(key);
    }
    if (!Array.isArray(rule.productIds) || rule.productIds.length > 20 || rule.productIds.some(id => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))) throw new Error('יש לבחור עד 20 מוצרים מהקטלוג לכל כלל');
    if (typeof rule.enabled !== 'boolean') throw new Error('נדרש מצב הפעלה מפורש לכל כלל');
    return { query: terms.join(', '), productIds: [...new Set(rule.productIds.map(id => id.toLowerCase()))], enabled: rule.enabled, ...(ruleId ? { ruleId, matchType: 'exact' } : {}) };
  });
}

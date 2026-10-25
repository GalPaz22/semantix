export const isActiveCampaign = proposal => ['running', 'applied', 'paused', 'scheduled'].includes(proposal.status);
export const hasCampaignHistory = proposal => ['completed', 'stopped'].includes(proposal.status);

export function campaignFeedback(metrics) {
  if (!metrics) return { tone: 'neutral', title: 'עדיין אין נתוני מעקב', detail: 'הפידבק יופיע לאחר תחילת המדידה וקליטת תנועה.' };
  if (metrics.complete === false) return { tone: 'warning', title: 'המדידה חלקית', detail: 'אין כיסוי מלא למדד שנבחר. אירועים חסרים אינם אפס המרות.' };
  const arms = metrics.arms || [];
  if (!arms.some(arm => arm.exposures > 0)) return { tone: 'neutral', title: 'ממתינים לתנועה', detail: 'טרם נקלטו ביקורים ששויכו לקמפיין.' };
  if (!arms.some(arm => arm.sessions > 0)) return { tone: 'neutral', title: 'הנתונים עדיין מבשילים', detail: 'ביקורים נכנסים למדידה לאחר 24 שעות מהחשיפה הראשונה.' };
  if (metrics.mode === 'observational') return { tone: 'neutral', title: 'מעקב אחר ההפעלה לכולם', detail: 'יחס ההמרה מתאר את הביצועים שנמדדו. ללא קבוצת ביקורת אי אפשר לייחס שינוי לקמפיין.' };
  const comparison = metrics.comparison;
  if (!comparison?.sufficient) return { tone: 'neutral', title: 'עדיין אין מספיק נתונים להשוואה', detail: 'נדרשים לפחות 100 ביקורים למדידה בכל גרסה ו־20 המרות בסך הכול להצגת אינדיקציה.' };
  if (comparison.signal === 'positive') return { tone: 'positive', title: 'אינדיקציה חיובית לשינוי', detail: 'ההצעה מציגה יחס המרה גבוה יותר מהמקור בנתונים שנמדדו.' };
  if (comparison.signal === 'negative') return { tone: 'negative', title: 'אינדיקציה לירידה בביצועים', detail: 'ההצעה מציגה יחס המרה נמוך יותר מהמקור בנתונים שנמדדו.' };
  return { tone: 'neutral', title: 'עדיין אין הבדל ברור בין הגרסאות', detail: 'טווח אי־הוודאות אינו מאפשר להצביע על שיפור או ירידה.' };
}

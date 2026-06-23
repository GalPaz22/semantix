import { getServerSession } from "next-auth";
import clientPromise from "/lib/mongodb";
import { authOptions } from "../../auth/[...nextauth]/route";
import { runAgent } from "/lib/agent/geminiRunner";

const INSIGHTS_COLLECTION = "agent_insights";
const REFRESH_INTERVAL_DAYS = 7;
const ADMIN_EMAIL = "galpaz2210@gmail.com";

const SYSTEM = `אתה אנליסט נתונים מומחה לחנות אונליין, שמדבר עברית.
המשימה שלך: לחקור את נתוני החנות דרך הכלים (tools) ולהפיק 3-5 תובנות עסקיות חדות ופעילות (actionable).

תהליך:
1. קרא ל-overview כדי להבין היקף נתונים ותאריכים.
2. קרא לכלים רלוונטיים (top_queries, zero_result_queries, conversion_funnel, top_clicked_products, cart_products, query_trends, category_breakdown) לפי הצורך. אל תקרא לאותו כלי פעמיים.
3. נתח וזהה את הדברים הכי חשובים: ביקושים לא ממומשים, מוצרים חמים, צווארי בקבוק בפאנל, מגמות.

כשסיימת לחקור, החזר אך ורק JSON תקין (ללא טקסט נוסף, ללא markdown) במבנה:
{
  "insights": [
    {
      "title": "כותרת קצרה בעברית",
      "severity": "high" | "medium" | "low" | "positive",
      "metric": "מספר/אחוז מרכזי כמחרוזת קצרה, או null",
      "body": "1-2 משפטים שמסבירים את התובנה עם נתונים קונקרטיים.",
      "action": "המלצה עסקית אחת ברורה לפעולה."
    }
  ]
}

חשוב: היה תמציתי. בסס כל תובנה על מספרים אמיתיים מהכלים. החזר JSON בלבד.`;

function extractJson(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { dbName, days = 30, force = false } = await request.json();
    if (!dbName) return Response.json({ error: "Missing dbName" }, { status: 400 });

    const client = await clientPromise;
    const col = client.db(dbName).collection(INSIGHTS_COLLECTION);

    // Serve the most recent logged insights if still fresh (weekly refresh window).
    if (!force) {
      const latest = await col.findOne(
        { kind: "insights", days },
        { sort: { generatedAt: -1 } }
      );
      if (latest) {
        const ageMs = Date.now() - new Date(latest.generatedAt).getTime();
        const fresh = ageMs < REFRESH_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
        if (fresh && Array.isArray(latest.insights) && latest.insights.length) {
          return Response.json({
            insights: latest.insights,
            generatedAt: latest.generatedAt,
            cached: true,
          });
        }
      }
    }

    // Generate fresh insights. Capped effort/tokens/turns to keep cost predictable.
    const { text, toolLog } = await runAgent({
      dbName,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `הפק תובנות עסקיות עבור החנות עבור ${days} הימים האחרונים. החזר JSON בלבד.`,
        },
      ],
      maxTurns: 6,
    });

    const parsed = extractJson(text);
    if (!parsed?.insights?.length) {
      return Response.json({ insights: [], raw: text, toolLog });
    }

    const generatedAt = new Date();
    // Log this generation (append, keep history). Best-effort — don't fail the response on write error.
    try {
      await col.insertOne({
        kind: "insights",
        days,
        insights: parsed.insights,
        generatedAt,
        generatedBy: session.user.email,
        toolCount: toolLog?.length || 0,
      });
    } catch (e) {
      console.error("[API Agent Insights] log write failed:", e.message);
    }

    return Response.json({
      insights: parsed.insights,
      generatedAt: generatedAt.toISOString(),
      cached: false,
    });
  } catch (error) {
    console.error("[API Agent Insights] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { runAgentStream } from "/lib/agent/geminiRunner";

const ADMIN_EMAIL = "galpaz2210@gmail.com";

const SYSTEM = `אתה אנליסט נתונים מומחה לחנות אונליין, שמדבר עברית.
יש לך גישה לנתוני חיפוש, קליקים על מוצרים, הוספות לעגלה ופרופילים של משתמשים דרך כלים (tools).
המשתמש שלך הוא בעל החנות. ענה בעברית, בצורה תמציתית ומבוססת נתונים.

הנחיות:
- תמיד בסס תשובות על קריאה לכלים. אל תמציא מספרים.
- אם רלוונטי, קרא קודם ל-overview כדי להבין את היקף הנתונים.
- צטט מספרים קונקרטיים (כמויות, אחוזים) שקיבלת מהכלים.
- כשאתה מזהה בעיה (למשל חיפושים ללא תוצאות), הצע פעולה עסקית ברורה.
- היה ענייני. אל תחזור על השאלה. אל תסביר אילו כלים השתמשת בהם אלא אם נשאלת.`;

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.email.toLowerCase() !== ADMIN_EMAIL) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { dbName, messages } = await request.json();
    if (!dbName) return Response.json({ error: "Missing dbName" }, { status: 400 });
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Missing messages" }, { status: 400 });
    }

    // Sanitize history to {role, content} text turns only.
    const cleaned = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-12);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of runAgentStream({ dbName, system: SYSTEM, messages: cleaned })) {
            controller.enqueue(encoder.encode(delta));
          }
        } catch (err) {
          console.error("[API Agent Chat] stream error:", err);
          controller.enqueue(encoder.encode(`\n\n[שגיאה: ${err.message}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[API Agent Chat] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

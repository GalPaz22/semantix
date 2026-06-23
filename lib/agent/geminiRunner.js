import { GoogleGenAI } from "@google/genai";
import { runTool, TOOL_SCHEMAS } from "./dataTools";

const MODEL = "gemini-2.5-flash-lite";

let _ai = null;
function getAI() {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key || key === "YOUR_GOOGLE_AI_KEY") {
    throw new Error("GOOGLE_AI_API_KEY is not set. Add it to .env.local to use the data agent.");
  }
  if (!_ai) _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
}

// Gemini function declarations derived from the shared tool schemas.
const FUNCTION_DECLARATIONS = TOOL_SCHEMAS.map((t) => ({
  name: t.name,
  description: t.description,
  parametersJsonSchema: t.input_schema,
}));

const TOOLS = [{ functionDeclarations: FUNCTION_DECLARATIONS }];

// Map our stored chat history ({role: user|assistant, content: string}) to Gemini contents.
function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

// flash-lite sometimes returns an empty final turn after a tool call (treats the
// tool result as self-evident). When that happens we nudge it once to write text.
const NUDGE =
  "ענה עכשיו בעברית במילים, על סמך הנתונים שקיבלת מהכלים. אל תקרא לכלים נוספים — כתוב תשובה קצרה וברורה.";
const EMPTY_FALLBACK = "לא הצלחתי להפיק תשובה. נסה לנסח את השאלה מחדש.";

function buildConfig(system) {
  return {
    systemInstruction: system,
    tools: TOOLS,
    thinkingConfig: { thinkingBudget: 0 },
  };
}

async function executeFunctionCalls(dbName, calls, toolLog) {
  const parts = [];
  for (const call of calls) {
    let response;
    try {
      const data = await runTool(dbName, call.name, call.args || {});
      toolLog.push({ tool: call.name, input: call.args, ok: true });
      response = { result: data };
    } catch (err) {
      toolLog.push({ tool: call.name, input: call.args, ok: false, error: err.message });
      response = { error: err.message };
    }
    parts.push({ functionResponse: { name: call.name, response } });
  }
  return parts;
}

// Non-streaming agentic loop (used for insights). Returns final text + tool log.
export async function runAgent({ dbName, system, messages, maxTurns = 8 }) {
  const ai = getAI();
  const config = buildConfig(system);
  const contents = toGeminiContents(messages);
  const toolLog = [];
  let nudged = false;

  for (let turn = 0; turn < maxTurns; turn++) {
    const resp = await ai.models.generateContent({ model: MODEL, contents, config });
    const parts = resp.candidates?.[0]?.content?.parts || [];
    contents.push({ role: "model", parts });

    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);
    if (calls.length === 0) {
      const text = parts
        .filter((p) => typeof p.text === "string")
        .map((p) => p.text)
        .join("")
        .trim();
      if (text) return { text, toolLog };
      // Empty turn — nudge once for an actual answer before giving up.
      if (!nudged) {
        nudged = true;
        contents.push({ role: "user", parts: [{ text: NUDGE }] });
        continue;
      }
      return { text: EMPTY_FALLBACK, toolLog };
    }

    const responseParts = await executeFunctionCalls(dbName, calls, toolLog);
    contents.push({ role: "user", parts: responseParts });
  }

  return { text: "הסוכן הגיע למספר המקסימלי של צעדים. נסה לחדד את השאלה.", toolLog };
}

// Streaming agentic loop (used for chat). Async generator yielding text deltas.
// Tool-call turns are executed silently; only assistant text is streamed.
export async function* runAgentStream({ dbName, system, messages, maxTurns = 8 }) {
  const ai = getAI();
  const config = buildConfig(system);
  const contents = toGeminiContents(messages);
  const toolLog = [];
  let nudged = false;
  let yieldedAny = false;

  for (let turn = 0; turn < maxTurns; turn++) {
    const stream = await ai.models.generateContentStream({ model: MODEL, contents, config });

    const functionCalls = [];
    const modelParts = [];
    let textBuffer = "";

    for await (const chunk of stream) {
      const parts = chunk.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.functionCall) {
          functionCalls.push(part.functionCall);
          modelParts.push(part);
        } else if (typeof part.text === "string" && part.text.length) {
          textBuffer += part.text;
          yieldedAny = true;
          yield part.text;
        }
      }
    }

    if (textBuffer) modelParts.unshift({ text: textBuffer });
    if (modelParts.length) contents.push({ role: "model", parts: modelParts });

    if (functionCalls.length === 0) {
      if (textBuffer) return;
      // Empty turn (flash-lite quirk) — nudge once for an actual answer.
      if (!nudged) {
        nudged = true;
        contents.push({ role: "user", parts: [{ text: NUDGE }] });
        continue;
      }
      if (!yieldedAny) yield EMPTY_FALLBACK;
      return;
    }

    const responseParts = await executeFunctionCalls(dbName, functionCalls, toolLog);
    contents.push({ role: "user", parts: responseParts });
  }

  if (!yieldedAny) yield EMPTY_FALLBACK;
}

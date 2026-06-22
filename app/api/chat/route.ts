/**
 * Chat API Route
 * ===============
 * This is Fēi's brain. Configurable to use either Claude or Gemini
 * as the primary AI, controlled by the PRIMARY_AI env variable.
 * 
 * Set PRIMARY_AI=gemini in .env.local to use Gemini (cheaper)
 * Set PRIMARY_AI=claude to use Claude (higher quality)
 * Default: gemini
 */

import { NextRequest } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { queryChinaSource } from "@/lib/china-source";

// Keywords that suggest the user is asking about specific places or activities
const PLACE_KEYWORDS = [
  "recommend", "suggest", "where", "restaurant", "hotel", "visit",
  "attraction", "food", "eat", "stay", "see", "do", "temple", "museum",
  "park", "market", "shop", "itinerary", "plan", "day", "morning",
  "afternoon", "evening", "place", "spot", "area", "neighbourhood",
  "neighborhood", "district",
];

function shouldQueryChineseSource(message: string): boolean {
  const lower = message.toLowerCase();
  return PLACE_KEYWORDS.some((kw) => lower.includes(kw));
}

// Stream using Claude (Anthropic SDK)
async function streamClaude(
  systemPrompt: string,
  messages: { role: string; content: string }[]
) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

  const claudeMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: claudeMessages,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const data = JSON.stringify({ text: event.delta.text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("Claude stream error:", err);
        controller.error(err);
      }
    },
  });
}

// Stream using Qwen Plus (OpenAI-compatible API via DashScope)
async function streamQwen(
  systemPrompt: string,
  messages: { role: string; content: string }[]
) {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.QWEN_API_KEY || "",
    baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  });

  const qwenMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const stream = await client.chat.completions.create({
    model: "qwen-plus",
    messages: qwenMessages,
    max_tokens: 16384,
    temperature: 0.8,
    stream: true,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            const data = JSON.stringify({ text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("Qwen stream error:", err);
        controller.error(err);
      }
    },
  });
}

// Stream using Gemini (Google Gen AI SDK)
async function streamGemini(
  systemPrompt: string,
  messages: { role: string; content: string }[]
) {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // Convert messages to Gemini format
  const geminiHistory = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1].content;

  const response = await ai.models.generateContentStream({
    model: "gemini-2.5-pro",
    contents: [
      ...geminiHistory,
      { role: "user", parts: [{ text: lastMessage }] },
    ],
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 16384,
      temperature: 0.7,
    },
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of response) {
          const text = chunk.text;
          if (text) {
            const data = JSON.stringify({ text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("Gemini stream error:", err);
        controller.error(err);
      }
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
      });
    }

    const lastUserMessage =
      [...messages].reverse().find((m: { role: string }) => m.role === "user")
        ?.content || "";

    // Query Chinese sources when the message contains place-related keywords
    // With the intake form, even the first message has enough context
    let chinaContext = "";
    if (shouldQueryChineseSource(lastUserMessage)) {
      // Include full conversation context so Chinese source AI knows all details
      const fullContext = messages
        .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
        .join("\n");
      const enrichedQuery = `Based on this conversation:\n${fullContext}\n\nProvide SPECIFIC travel recommendations. Name exact restaurants, shops, venues, and attractions. Include specific details like prices, addresses, what to order, what's unique. Focus on places that locals recommend on 小红书 and 大众点评, not generic tourist advice. For: ${lastUserMessage}`;
      const result = await queryChinaSource(enrichedQuery);
      if (result) {
        chinaContext = `\n\n<chinese_source_intel source="${result.source}">\nThe following tips and recommendations come from Chinese travel platforms (小红书, 大众点评, 马蜂窝).\n\nOVERRIDE RULE: If this intel contradicts your own knowledge — e.g. an attraction is closed, hours have changed, a route is no longer available — treat this intel as ground truth. Do NOT use your own assumptions instead.\n\nFor every place in your itinerary:\n1. CHECK if this data mentions it and USE those specific tips\n2. PREFER these tips over your own general knowledge\n3. Include them as 💡 Local tip notes with SPECIFIC details (dish names, prices, stall numbers)\n4. If this data names specific restaurants, shops, or venues, USE those exact names in Chinese characters\n\n${result.content}\n\n</chinese_source_intel>`;
      }
    }

    const fullSystemPrompt = SYSTEM_PROMPT + chinaContext;

    // Choose AI based on PRIMARY_AI env variable (default: claude)
    const primaryAI = process.env.PRIMARY_AI || "claude";
    console.log(`Using ${primaryAI} as primary AI`);

    let readable: ReadableStream;
    if (primaryAI === "claude") {
      readable = await streamClaude(fullSystemPrompt, messages);
    } else if (primaryAI === "qwen") {
      readable = await streamQwen(fullSystemPrompt, messages);
    } else {
      readable = await streamGemini(fullSystemPrompt, messages);
    }

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500 }
    );
  }
}

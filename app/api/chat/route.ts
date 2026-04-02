/**
 * Chat API Route
 * ===============
 * This is Fēi's brain. When a user sends a message:
 * 1. Check if it's about specific places → query Chinese sources in parallel
 * 2. Send conversation + any Chinese-source context to Claude
 * 3. Stream Claude's response back to the browser (no timeout!)
 *
 * IMPORTANT: This runs server-side. API keys stay secret.
 * The streaming approach is the key fix for mobile timeout issues.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { queryChinaSource } from "@/lib/china-source";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Keywords that suggest the user is asking about specific places or activities
const PLACE_KEYWORDS = [
  "recommend",
  "suggest",
  "where",
  "restaurant",
  "hotel",
  "visit",
  "attraction",
  "food",
  "eat",
  "stay",
  "see",
  "do",
  "temple",
  "museum",
  "park",
  "market",
  "shop",
  "itinerary",
  "plan",
  "day",
  "morning",
  "afternoon",
  "evening",
  "place",
  "spot",
  "area",
  "neighbourhood",
  "neighborhood",
  "district",
];

function shouldQueryChineseSource(message: string): boolean {
  const lower = message.toLowerCase();
  return PLACE_KEYWORDS.some((kw) => lower.includes(kw));
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

    // Only query Chinese sources when:
    // 1. The conversation is past the info-gathering phase (4+ messages = 2 exchanges)
    // 2. The message contains place-related keywords
    // This keeps early responses fast (3-5s) and only adds the Chinese-source
    // delay when Fēi is actually recommending specific places.
    const isReadyForPlaces = messages.length >= 4;
    let chinaContext = "";
    if (isReadyForPlaces && shouldQueryChineseSource(lastUserMessage)) {
      // Include recent conversation context so Chinese source AI knows the group details
      const recentContext = messages
        .slice(-6)
        .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
        .join("\n");
      const enrichedQuery = `Based on this conversation:\n${recentContext}\n\nProvide detailed travel recommendations for: ${lastUserMessage}`;
      const result = await queryChinaSource(enrichedQuery);
      if (result) {
        chinaContext = `\n\n[CHINESE SOURCE INTELLIGENCE — from ${result.source}]\nThe following insights come from Chinese travel platforms. Weave these naturally into your response — don't cite the source by name, just use the knowledge as if it's your own expertise:\n\n${result.content}\n\n[END CHINESE SOURCE INTELLIGENCE]`;
      }
    }

    // Build the system prompt, injecting Chinese-source context if available
    const fullSystemPrompt = SYSTEM_PROMPT + chinaContext;

    // Format messages for Claude
    const claudeMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    // Stream the response — this keeps the connection alive on mobile
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: fullSystemPrompt,
      messages: claudeMessages,
    });

    // Convert to a ReadableStream for the browser
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              // Send each text chunk as a server-sent event
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      },
    });

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

/**
 * DeepSeek API integration
 * ========================
 * DeepSeek uses an OpenAI-compatible API.
 * This is one of the Chinese-source AIs — activated when you add DEEPSEEK_API_KEY.
 */

import OpenAI from "openai";

const DEEPSEEK_PROMPT = `You are a travel research assistant with deep knowledge of Chinese travel platforms.
When asked about a place or experience in China, provide detailed, practical information as if you're
drawing from 小红书 (Xiaohongshu), 大众点评 (Dianping), and 马蜂窝 (Mafengwo). Include:
- Specific tips that only locals or frequent Chinese-platform users would know
- Current practical details (opening hours patterns, ticket booking tips, best times to visit)
- Honest assessments — flag tourist traps, overcrowded times, and hidden gems
- Accessibility notes for elderly visitors and young children
Respond in English. Be specific and practical, not generic.`;

export async function queryDeepSeek(
  query: string,
  signal?: AbortSignal
): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.log("DeepSeek: No API key configured, skipping.");
    return null;
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
    });

    const response = await client.chat.completions.create(
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: DEEPSEEK_PROMPT },
          { role: "user", content: query },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      },
      { signal }
    );

    return response.choices[0]?.message?.content || null;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      console.log("DeepSeek: Request cancelled (other source responded first).");
      return null;
    }
    console.error("DeepSeek: Request failed:", err);
    return null;
  }
}

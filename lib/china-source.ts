/**
 * China Source — Racing Logic
 * ============================
 * Fires DeepSeek and Qwen simultaneously. Uses whichever responds first.
 * If one has no API key, the other runs alone. If both fail, returns null
 * and Claude handles the response solo.
 *
 * This is the key fix for DeepSeek timeout issues — Qwen acts as a hot
 * backup so the user never waits for a hung request.
 */

import { queryDeepSeek } from "./deepseek";
import { queryQwen } from "./qwen";

interface ChinaSourceResult {
  content: string;
  source: "deepseek" | "qwen";
}

const TIMEOUT_MS = 15000; // 15 second max wait

export async function queryChinaSource(
  query: string
): Promise<ChinaSourceResult | null> {
  const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;
  const hasQwen = !!process.env.QWEN_API_KEY;

  // No Chinese-source AI configured at all
  if (!hasDeepSeek && !hasQwen) {
    console.log("China source: No API keys configured for either service.");
    return null;
  }

  // Only one configured — just call it directly
  if (hasDeepSeek && !hasQwen) {
    const result = await withTimeout(queryDeepSeek(query), TIMEOUT_MS);
    return result ? { content: result, source: "deepseek" } : null;
  }

  if (!hasDeepSeek && hasQwen) {
    const result = await withTimeout(queryQwen(query), TIMEOUT_MS);
    return result ? { content: result, source: "qwen" } : null;
  }

  // Both configured — race them!
  const deepseekController = new AbortController();
  const qwenController = new AbortController();

  try {
    const result = await Promise.any([
      queryDeepSeek(query, deepseekController.signal).then((content) => {
        if (!content) throw new Error("DeepSeek returned empty");
        qwenController.abort(); // Cancel the other
        return { content, source: "deepseek" as const };
      }),
      queryQwen(query, qwenController.signal).then((content) => {
        if (!content) throw new Error("Qwen returned empty");
        deepseekController.abort(); // Cancel the other
        return { content, source: "qwen" as const };
      }),
      // Timeout failsafe
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS)
      ),
    ]);

    console.log(`China source: ${result.source} responded first.`);
    return result;
  } catch {
    // Both failed or timed out
    console.log("China source: Both DeepSeek and Qwen failed or timed out.");
    deepseekController.abort();
    qwenController.abort();
    return null;
  }
}

/** Helper: wraps a promise with a timeout */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T | null> {
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  } catch {
    return null;
  }
}

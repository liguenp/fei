/**
 * China Source — Qwen Only
 * =========================
 * Queries Qwen for local Chinese travel intelligence.
 * Returns null if Qwen fails or times out, and the primary AI
 * handles the response solo.
 */

import { queryQwen } from "./qwen";

interface ChinaSourceResult {
  content: string;
  source: "qwen";
}

const TIMEOUT_MS = 15000; // 15 second max wait

export async function queryChinaSource(
  query: string
): Promise<ChinaSourceResult | null> {
  const hasQwen = !!process.env.QWEN_API_KEY;

  if (!hasQwen) {
    console.log("China source: No Qwen API key configured.");
    return null;
  }

  try {
    const result = await Promise.race([
      queryQwen(query),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);

    if (result) {
      console.log("China source: Qwen responded.");
      return { content: result, source: "qwen" };
    }

    console.log("China source: Qwen timed out.");
    return null;
  } catch {
    console.log("China source: Qwen failed.");
    return null;
  }
}

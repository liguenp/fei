"use client";

import { useState, useCallback } from "react";
import Header from "@/components/Header";
import ChatWindow, { Message } from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: `Hi! I'm **Fēi (飞)** — your China trip planning assistant. 🛫

I specialise in planning trips that work for *everyone* in your group — whether that's elderly parents who need flat terrain, toddlers who need nap breaks, or teens who want something more exciting than another temple.

I pull from Chinese travel platforms like 小红书 and 大众点评 to give you insider tips most English-language tools miss.

**Tell me about your trip!** Where in China are you thinking of going, and who's coming along?`,
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = useCallback(
    async (content: string) => {
      // Add user message to chat
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);

      // Prepare messages for API (exclude welcome message ID, send role+content only)
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Reassurance timer — if response takes more than 8s, show a message
      const reassuranceMessages = [
        "Still working on this — pulling from Chinese travel sources...",
        "Almost there — building your itinerary...",
        "Taking a bit longer than usual — hang tight...",
      ];
      let reassuranceIndex = 0;
      const statusId = `status-${Date.now()}`;
      let statusShown = false;

      const reassuranceTimer = setInterval(() => {
        if (reassuranceIndex < reassuranceMessages.length) {
          if (!statusShown) {
            setMessages((prev) => [
              ...prev,
              { id: statusId, role: "assistant", content: reassuranceMessages[reassuranceIndex] },
            ]);
            statusShown = true;
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === statusId
                  ? { ...m, content: reassuranceMessages[reassuranceIndex] }
                  : m
              )
            );
          }
          reassuranceIndex++;
        }
      }, 8000);

      const clearReassurance = () => {
        clearInterval(reassuranceTimer);
        // Remove the status message once real response arrives
        if (statusShown) {
          setMessages((prev) => prev.filter((m) => m.id !== statusId));
        }
      };

      // Retry logic — try up to 2 times on failure
      const maxRetries = 1;
      let lastError: unknown = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          // 90 second timeout for the entire request
          const timeoutId = setTimeout(() => controller.abort(), 90000);

          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: apiMessages }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response stream");

          const decoder = new TextDecoder();
          const assistantId = `assistant-${Date.now()}`;
          let assistantContent = "";

          // Clear reassurance and add empty assistant message to stream into
          clearReassurance();
          setMessages((prev) => [
            ...prev,
            { id: assistantId, role: "assistant", content: "" },
          ]);
          setIsLoading(false);

          // Read the stream chunk by chunk
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantContent += parsed.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: assistantContent }
                        : m
                    )
                  );
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }

          // Success — exit the retry loop
          return;
        } catch (err) {
          lastError = err;
          console.error(`Chat error (attempt ${attempt + 1}):`, err);
          // If we have retries left, wait briefly then try again
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      }

      // All attempts failed
      clearReassurance();
      setIsLoading(false);
      console.error("Chat failed after retries:", lastError);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, I had trouble responding. This might be due to a slow connection to Chinese travel sources. Please try again.",
        },
      ]);
    },
    [messages]
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-stone-50">
      <Header />
      <ChatWindow messages={messages} isLoading={isLoading} />
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}

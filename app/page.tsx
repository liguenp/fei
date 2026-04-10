"use client";

import { useState, useCallback, useRef } from "react";
import { track } from "@vercel/analytics";
import Header from "@/components/Header";
import ChatWindow, { Message } from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import IntakeForm from "@/components/IntakeForm";

export default function Home() {
  const [showForm, setShowForm] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const trackedStages = useRef<Set<string>>(new Set());
  const postItineraryCount = useRef(0);

  const trackStage = (stage: string, data?: Record<string, string>) => {
    if (trackedStages.current.has(stage)) return;
    trackedStages.current.add(stage);
    track(stage, data);
  };

  const handleSend = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);

      if (trackedStages.current.has("fei_itinerary_generated")) {
        postItineraryCount.current += 1;
        if (postItineraryCount.current === 1) {
          window.gtag?.('event', 'post_itinerary_engaged');
        } else if (postItineraryCount.current === 3) {
          window.gtag?.('event', 'post_itinerary_deep_engaged');
        }
      }

      const userMessageCount = updatedMessages.filter(m => m.role === "user").length;
      if (userMessageCount === 1) {
        trackStage("fei_first_message");
      } else if (userMessageCount === 2) {
        trackStage("fei_continued_conversation");
      }
      if (/^\d[\d,\s]+$/.test(content.trim()) || /must|skip|optional/i.test(content)) {
        trackStage("fei_place_selection");
        window.gtag?.('event', 'places_selected');
      }

      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

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
        if (statusShown) {
          setMessages((prev) => prev.filter((m) => m.id !== statusId));
        }
      };

      const maxRetries = 1;
      let lastError: unknown = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
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

          clearReassurance();
          setMessages((prev) => [
            ...prev,
            { id: assistantId, role: "assistant", content: "" },
          ]);
          setIsLoading(false);

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

          if (assistantContent.includes("### Day") || assistantContent.includes("## Day")) {
            trackStage("fei_itinerary_generated");
            window.gtag?.('event', 'itinerary_generated');
            // Append a separate note after the itinerary
            setMessages((prev) => [
              ...prev,
              {
                id: `note-${Date.now()}`,
                role: "assistant",
                content: "📌 **Tip:** Copy and paste the itinerary above to keep a copy — it won't be saved after your session ends.",
              },
            ]);
          }
          return;
        } catch (err) {
          lastError = err;
          console.error(`Chat error (attempt ${attempt + 1}):`, err);
          track("fei_error", { attempt: String(attempt + 1) });
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      }

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

  const handleFormSubmit = useCallback(
    (summary: string) => {
      trackStage("fei_form_completed");
      setShowForm(false);
      handleSend(summary);
    },
    [handleSend]
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-stone-50">
      <Header />
      {showForm ? (
        <IntakeForm onSubmit={handleFormSubmit} />
      ) : (
        <>
          <ChatWindow messages={messages} isLoading={isLoading} />
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </>
      )}
    </div>
  );
}

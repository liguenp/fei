"use client";

import { useRef, useEffect, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "feedback";
}

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onFeedbackClick: (value: "positive" | "negative") => void;
}

const TIME_LABELS = /^(Morning|Afternoon|Evening|Night|Lunch|Dinner|Breakfast):\s*/;

const markdownComponents: Components = {
  strong: ({ children, ...props }) => {
    const text = String(children);
    const match = text.match(TIME_LABELS);
    if (match) {
      const timeLabel = match[1] + ":";
      const placeName = text.slice(match[0].length);
      return (
        <strong {...props}>
          <span style={{ color: "#ea580c" }}>{timeLabel}</span> {placeName}
        </strong>
      );
    }
    return <strong {...props}>{children}</strong>;
  },
};

/**
 * Preprocess markdown to ensure note lines (📋, ✅, ⚠️, ⏰, 👶, 🧓)
 * each render on their own line. In standard markdown, consecutive lines
 * without a blank line between them merge into one paragraph. This
 * preprocessor inserts blank lines between consecutive note lines
 * so each becomes its own <p> element.
 */
function preprocessMarkdown(content: string): string {
  if (!content) return "";
  const NOTE_PATTERN = /^(📋|✅|⚠️|⏰|👶|🧓|♿|👴|👵|💡|💰)/;
  const HR_PATTERN = /^---+$/;
  const H2_PATTERN = /^##\s/;
  const lines = content.split("\n");
  const result: string[] = [];
  let lastWasHr = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Skip duplicate horizontal rules
    if (HR_PATTERN.test(trimmed)) {
      if (lastWasHr) continue;
      // Look ahead: if the next non-blank line is a ## heading, skip the ---
      // (CSS border-top on h2 already provides the divider)
      let skip = false;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === "") continue;
        if (H2_PATTERN.test(lines[j].trim())) skip = true;
        break;
      }
      if (skip) continue;
      lastWasHr = true;
      result.push(trimmed);
      continue;
    }

    if (trimmed !== "") lastWasHr = false;

    if (NOTE_PATTERN.test(trimmed)) {
      if (i > 0 && result.length > 0 && result[result.length - 1].trim() !== "") {
        result.push("");
      }
      result.push(trimmed);
    } else {
      result.push(lines[i]);
    }
  }

  return result.join("\n");
}

export default function ChatWindow({ messages, isLoading, onFeedbackClick }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, "positive" | "negative">>({});

  const handleFeedback = (messageId: string, value: "positive" | "negative") => {
    if (feedbackState[messageId]) return;
    console.log(`Feedback: ${value}`);
    window.gtag?.('event', 'itinerary_feedback', { feedback_type: value });
    setFeedbackState((prev) => ({ ...prev, [messageId]: value }));
    onFeedbackClick(value);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className="chat-scroll flex-1 overflow-y-auto px-4 py-6"
    >
      <div className="mx-auto max-w-2xl space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-fei-500 text-white"
                  : "bg-white text-stone-800 shadow-sm ring-1 ring-stone-100"
              }`}
            >
              {msg.type === "feedback" ? (
                <div className="flex flex-col gap-3">
                  <p className="text-stone-700">Did you find this useful?</p>
                  {feedbackState[msg.id] ? (
                    <p className="text-stone-500 text-xs">Thanks for the feedback!</p>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleFeedback(msg.id, "positive")}
                        disabled={!!feedbackState[msg.id]}
                        className="text-xl leading-none disabled:opacity-40 transition-opacity"
                        aria-label="Thumbs up"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, "negative")}
                        disabled={!!feedbackState[msg.id]}
                        className="text-xl leading-none disabled:opacity-40 transition-opacity"
                        aria-label="Thumbs down"
                      >
                        👎
                      </button>
                    </div>
                  )}
                </div>
              ) : msg.role === "assistant" ? (
                <div className="prose prose-sm prose-stone max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-stone-900">
                  <ReactMarkdown components={markdownComponents}>{preprocessMarkdown(msg.content)}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-100">
              <div className="typing-dot h-1.5 w-1.5 rounded-full bg-stone-400" />
              <div className="typing-dot h-1.5 w-1.5 rounded-full bg-stone-400" />
              <div className="typing-dot h-1.5 w-1.5 rounded-full bg-stone-400" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    // Reset height after send
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter sends, Shift+Enter adds new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-stone-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-end gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell Fēi about your trip..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm
                     placeholder:text-stone-400 focus:border-orange-400 focus:bg-white focus:outline-none
                     focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fei-500
                     text-white transition-all hover:bg-fei-600 active:scale-95
                     disabled:opacity-30 disabled:hover:bg-fei-500 disabled:active:scale-100"
          aria-label="Send message"
        >
          {/* Paper plane icon */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

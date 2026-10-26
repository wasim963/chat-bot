"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || isLoading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { detail?: string };
        throw new Error(result.detail ?? "The chat request failed.");
      }

      const result = (await response.json()) as { message: Message };
      setMessages((current) => [...current, result.message]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not connect to the chat service.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <main className="page-shell">
      <section className="chat-card" aria-label="Chatbot">
        <header className="chat-header">
          <div className="avatar" aria-hidden="true">
            ✦
          </div>
          <div>
            <h1>Chatbot</h1>
            <p>
              <span className="status-dot" />
              Powered by your LLM
            </p>
          </div>
        </header>

        <div className="conversation" aria-live="polite">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-icon" aria-hidden="true">
                ✦
              </div>
              <h2>What can I help with?</h2>
              <p>Ask a question to start a conversation.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div className={`message-row ${message.role}`} key={index}>
                {message.role === "assistant" && (
                  <div className="message-avatar" aria-hidden="true">
                    ✦
                  </div>
                )}
                <p className="message-bubble">{message.content}</p>
              </div>
            ))
          )}
          {isLoading && (
            <div className="message-row assistant" aria-label="Assistant is thinking">
              <div className="message-avatar" aria-hidden="true">
                ✦
              </div>
              <p className="message-bubble typing">Thinking…</p>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>

        <div className="composer-area">
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <form className="composer" onSubmit={sendMessage}>
            <textarea
              aria-label="Your message"
              placeholder="Message the assistant…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
            <button
              aria-label="Send message"
              type="submit"
              disabled={isLoading || !input.trim()}
            >
              ↑
            </button>
          </form>
          <p className="hint">Enter to send · Shift + Enter for a new line</p>
        </div>
      </section>
    </main>
  );
}

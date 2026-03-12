"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

type ChatRole = "user" | "assistant";
type Stance = "for" | "against" | "auto";

type ChatMessage = {
  role: ChatRole;
  content: string;
  timestamp: string;
};

const quickQuestions = [
  "Who won the last Lakers vs Clippers game?",
  "Is LeBron the GOAT?",
  "Latest NFL injury reports",
  "Best active soccer player?",
  "Will the Yankees win the World Series?",
  "Most dominant team in sports?"
];

const stanceOptions: { value: Stance; label: string; description: string }[] = [
  {
    value: "for",
    label: "✅ Argue FOR",
    description: "You defend the topic, Bot opposes it"
  },
  {
    value: "against",
    label: "❌ Argue AGAINST",
    description: "You oppose the topic, Bot defends it"
  },
  {
    value: "auto",
    label: "🎲 Auto",
    description: "Bot picks the opposite side"
  }
];

function nowTimestamp() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function toBotStance(userStance: Stance): Stance {
  if (userStance === "for") return "against";
  if (userStance === "against") return "for";
  return "auto";
}

function DebatePageContent() {
  const searchParams = useSearchParams();
  const [topicInput, setTopicInput] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [stance, setStance] = useState<Stance>("auto");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const topic = searchParams.get("topic")?.trim() ?? "";
    if (topic && !started) {
      setTopicInput(topic);
    }
  }, [searchParams, started]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (
    explicitText?: string,
    explicitTopic?: string,
    baseMessages?: ChatMessage[]
  ) => {
    const text = (explicitText ?? draft).trim();
    const topic = (explicitTopic ?? activeTopic).trim();
    if (!text || !topic || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: nowTimestamp()
    };

    const history = baseMessages ?? messages;
    const nextMessages = [...history, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: nextMessages,
          topic,
          stance: toBotStance(stance)
        })
      });

      const data = await response.json();
      const reply =
        typeof data?.reply === "string" && data.reply.trim().length > 0
          ? data.reply.trim()
          : "CoachBot couldn't generate a response this round.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply,
          timestamp: nowTimestamp()
        }
      ]);
    } catch (error) {
      console.error("Failed to send chat message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "CoachBot is off the mic for a moment. Throw that take at me again.",
          timestamp: nowTimestamp()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const startDebate = () => {
    const topic = topicInput.trim();
    if (!topic) return;
    setActiveTopic(topic);
    setStarted(true);
    setMessages([]);
    setDraft("");
  };

  const startWithQuickQuestion = async (question: string) => {
    const topic = question.trim();
    if (!topic) return;
    setTopicInput(topic);
    setActiveTopic(topic);
    setStarted(true);
    setMessages([]);
    setDraft("");
    await sendMessage(question, topic, []);
  };

  const resetDebate = () => {
    setStarted(false);
    setActiveTopic("");
    setMessages([]);
    setDraft("");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-white">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {!started ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
            <h1 className="text-5xl leading-none">Debate Arena</h1>
            <p className="mt-2 text-sm text-white/70">
              Lock in your take and challenge CoachBot.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-white/85">
                Topic
                <input
                  value={topicInput}
                  onChange={(event) => setTopicInput(event.target.value)}
                  placeholder="Enter a sports debate topic..."
                  className="mt-2 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--accent-blue)]"
                />
              </label>

              <div>
                <p className="mb-2 text-sm font-semibold text-white/85">Stance</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {stanceOptions.map((option) => {
                    const active = stance === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setStance(option.value)}
                        className={`rounded-md px-3 py-2 text-left transition ${
                          active
                            ? "bg-[var(--accent-blue)] text-white"
                            : "border border-white/20 bg-black/20 text-white/75 hover:bg-white/10"
                        }`}
                      >
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className="mt-1 block text-xs text-white/70">{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={startDebate}
                disabled={!topicInput.trim()}
                className="rounded-md bg-[var(--accent-red)] px-5 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                START DEBATE
              </button>
            </div>

            <div className="mt-8">
              <h2 className="text-3xl leading-none">Quick Questions</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {quickQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void startWithQuickQuestion(question)}
                    className="rounded-md border border-white/10 bg-black/25 px-3 py-3 text-left text-sm text-white/90 transition hover:border-[var(--accent-blue)] hover:bg-black/40"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/65">Current Topic</p>
                <h1 className="text-4xl leading-none text-white">{activeTopic}</h1>
              </div>
              <button
                type="button"
                onClick={resetDebate}
                className="rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
              >
                NEW TOPIC
              </button>
            </div>

            <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-4">
              {messages.length === 0 ? (
                <p className="text-sm text-white/60">
                  Send the opening take to kick this debate off.
                </p>
              ) : null}

              {messages.map((message, index) => {
                const user = message.role === "user";
                return (
                  <div
                    key={`${message.timestamp}-${index}`}
                    className={`flex ${user ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl border p-3 ${
                        user
                          ? "border-blue-400/40 bg-[var(--accent-blue)]/20"
                          : "border-[var(--accent-red)]/35 bg-[#331216]"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs text-white/70">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                            user ? "bg-[var(--accent-blue)]/40" : "bg-[var(--accent-red)]/40"
                          }`}
                        >
                          {user ? "Y" : "C"}
                        </span>
                        <span className="font-semibold uppercase tracking-wide">
                          {user ? "You" : "CoachBot"}
                        </span>
                        <span>{message.timestamp}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/95">
                        {message.content}
                      </p>
                    </div>
                  </div>
                );
              })}

              {isLoading ? (
                <div className="flex justify-start">
                  <div className="rounded-xl border border-[var(--accent-red)]/35 bg-[#331216] p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-white/70">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-red)]/40 text-[11px] font-bold">
                        C
                      </span>
                      <span className="font-semibold uppercase tracking-wide">CoachBot</span>
                      <span>typing...</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-red)]" />
                      <span
                        className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-red)]"
                        style={{ animationDelay: "120ms" }}
                      />
                      <span
                        className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-red)]"
                        style={{ animationDelay: "240ms" }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Drop your argument. Enter to send, Shift+Enter for a new line."
                  rows={3}
                  className="w-full resize-none rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--accent-blue)]"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={isLoading || !draft.trim()}
                  className="rounded-md bg-[var(--accent-red)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function DebatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-primary)] text-white">
          <Navbar />
          <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="h-10 w-56 rounded bg-white/10" />
              <div className="mt-3 h-4 w-72 rounded bg-white/10" />
            </div>
          </main>
        </div>
      }
    >
      <DebatePageContent />
    </Suspense>
  );
}

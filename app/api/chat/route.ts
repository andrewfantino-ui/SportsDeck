import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type IncomingMessage = {
  role?: string;
  content?: unknown;
  timestamp?: unknown;
};

type ChatRequestBody = {
  messages?: IncomingMessage[];
  topic?: string;
  stance?: "for" | "against" | "auto" | string;
};

type StoredMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

function normalizeContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

function toAnthropicMessages(messages: IncomingMessage[] | undefined) {
  const normalized = (messages ?? [])
    .map((message) => {
      const role = message.role === "assistant" ? "assistant" : "user";
      const content = normalizeContent(message.content);
      return { role, content };
    })
    .filter((message) => message.content.length > 0);

  return normalized;
}

function toStoredMessages(messages: IncomingMessage[] | undefined): StoredMessage[] {
  return (messages ?? [])
    .map((message) => {
      const role: "user" | "assistant" = message.role === "assistant" ? "assistant" : "user";
      const content = normalizeContent(message.content);
      const timestamp =
        typeof message.timestamp === "string" && message.timestamp.trim().length > 0
          ? message.timestamp
          : new Date().toISOString();

      return { role, content, timestamp };
    })
    .filter((message) => message.content.length > 0);
}

function extractReplyText(content: Anthropic.Messages.Message["content"]) {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(request: Request) {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }

    const body = (await request.json()) as ChatRequestBody;
    const topic = (body.topic ?? "general sports debate").trim();
    const stance = (body.stance ?? "auto").toString().trim().toLowerCase();
    const incomingMessages = toAnthropicMessages(body.messages);
    const storedMessages = toStoredMessages(body.messages);

    const stanceInstruction =
      stance === "for"
        ? "Take the FOR side and defend the topic strongly."
        : stance === "against"
          ? "Take the AGAINST side and oppose the topic strongly."
          : "AUTO mode: pick the strongest side based on evidence and argue it confidently.";

    const systemPrompt = [
      "You are CoachBot, a passionate sports debate partner with strong opinions.",
      "Use stats, history, and concrete examples whenever possible.",
      "Challenge weak arguments directly and do not be neutral unless nuance is necessary.",
      "Always end every reply with a question or challenge.",
      "Keep responses to 2-4 short paragraphs.",
      "Use web search for current scores, recent news, and up-to-date context.",
      `Debate topic: ${topic}.`,
      `Stance mode: ${stance}. ${stanceInstruction}`
    ].join(" ");

    const messages =
      incomingMessages.length > 0
        ? incomingMessages
        : [{ role: "user" as const, content: `Let's debate: ${topic}` }];

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      tools: [{ type: "web_search_20250305", name: "web_search" } as any],
      messages
    } as any);

    const reply =
      extractReplyText(response.content) ||
      "CoachBot could not produce a text response. Try sending the prompt again.";

    const completedConversation: StoredMessage[] = [
      ...storedMessages,
      {
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString()
      }
    ];

    try {
      const { error: saveError } = await supabase.from("Debates").insert({
        topic,
        messages: completedConversation
      });
      if (saveError) {
        console.log("debate save failed:", saveError);
      }
    } catch (saveError) {
      console.log("debate save failed:", saveError);
    }

    return NextResponse.json({ reply: String(reply) });
  } catch (error) {
    console.log("chat route failed full error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "CoachBot is temporarily unavailable. Try again in a moment.";
    return NextResponse.json({ reply: String(message) });
  }
}

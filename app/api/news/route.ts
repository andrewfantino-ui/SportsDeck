import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type NewsArticle = {
  id: string;
  title: string;
  summary: string;
  sport: string;
  timeAgo: string;
  isHot: boolean;
  category: string;
};

const NEWS_CACHE_TTL_MS = 60 * 60 * 1000;
let newsCache:
  | {
      articles: NewsArticle[];
      timestamp: number;
    }
  | null = null;

const fallbackArticles: NewsArticle[] = [
  {
    id: "fallback-1",
    title: "NBA Playoff Race Tightens in Final Stretch",
    summary:
      "Several contenders are separated by a game as late-season matchups reshape projected seedings.",
    sport: "NBA",
    timeAgo: "1h ago",
    isHot: true,
    category: "Standings"
  },
  {
    id: "fallback-2",
    title: "NFL Teams Adjust Depth Charts After Injury Updates",
    summary:
      "Coaches are reworking game plans as key starters appear on weekly availability and injury reports.",
    sport: "NFL",
    timeAgo: "2h ago",
    isHot: true,
    category: "Injuries"
  },
  {
    id: "fallback-3",
    title: "MLB Rotation Battles Heat Up Early",
    summary:
      "Teams are testing bullpen usage and fifth-starter options as series matchups tighten.",
    sport: "MLB",
    timeAgo: "3h ago",
    isHot: false,
    category: "Game Recap"
  },
  {
    id: "fallback-4",
    title: "NHL Wild Card Picture Shifts Overnight",
    summary:
      "Back-to-back results changed both conference wild card odds and increased pressure on contenders.",
    sport: "NHL",
    timeAgo: "4h ago",
    isHot: false,
    category: "Standings"
  },
  {
    id: "fallback-5",
    title: "Soccer Title Race Intensifies Across Top Leagues",
    summary:
      "Late goals and dropped points opened new paths in league tables and European qualification battles.",
    sport: "Soccer",
    timeAgo: "4h ago",
    isHot: false,
    category: "League Update"
  },
  {
    id: "fallback-6",
    title: "UFC Contender Shuffle Follows Main Event Result",
    summary:
      "A decisive finish reshaped rankings and triggered fresh debate over the next title challenger.",
    sport: "UFC",
    timeAgo: "5h ago",
    isHot: false,
    category: "Rankings"
  },
  {
    id: "fallback-7",
    title: "Boxing Unification Talks Gain Momentum",
    summary:
      "Promoters signaled progress toward a marquee bout that could settle a long-running divisional debate.",
    sport: "Boxing",
    timeAgo: "6h ago",
    isHot: false,
    category: "Fight News"
  },
  {
    id: "fallback-8",
    title: "Tennis Stars Build Form Ahead of Major Draw",
    summary:
      "Recent hard-court performances are shifting expectations for deep runs in the upcoming tournament.",
    sport: "Tennis",
    timeAgo: "7h ago",
    isHot: false,
    category: "Tournament"
  }
];

function extractTextBlocks(content: Anthropic.Messages.Message["content"]) {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function getNcaaFocusByMonth(month: number) {
  if (month === 3 || month === 4) {
    return "NCAAB and NCAAW tournament news (March Madness and related postseason storylines)";
  }
  if (month >= 5 && month <= 7) {
    return "NCAA Baseball (College World Series race, regionals, super regionals, Omaha storylines)";
  }
  if (month >= 8 && month <= 12) {
    return "NCAAF (rankings, conference races, playoff implications, bowl and title storylines)";
  }
  return "NCAAB and NCAAW regular season and conference play storylines";
}

export async function GET() {
  let rawModelText = "";
  const now = Date.now();
  if (newsCache && now - newsCache.timestamp < NEWS_CACHE_TTL_MS) {
    return NextResponse.json({ articles: newsCache.articles });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const month = new Date().getMonth() + 1;
    const ncaaFocus = getNcaaFocusByMonth(month);

    const prompt = [
      `Today is ${today}.`,
      "Search the web for today's top 8 sports news stories from March 11 2026 across NBA, NFL, MLB, NHL, Soccer, UFC, Boxing and Tennis. Return ONLY a valid JSON array with no markdown.",
      `Also include NCAA coverage, but prioritize whichever NCAA sport is currently most relevant this time of year: ${ncaaFocus}.`,
      "If multiple NCAA sports are in season, prioritize the most newsworthy NCAA storyline right now instead of forcing equal NCAA coverage.",
      "Each array item must include exactly these fields: id, title, summary, sport, timeAgo, isHot, category.",
      "Set isHot=true for the top 2 stories and false for the rest."
    ].join(" ");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      tools: [{ type: "web_search_20250305", name: "web_search" } as any],
      messages: [{ role: "user", content: prompt }]
    } as any);

    const text = extractTextBlocks(response.content);
    rawModelText = text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error(`No JSON array found in model output. Raw output: ${text.slice(0, 500)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      throw new Error("Parsed payload is not an array");
    }

    const limited = parsed.slice(0, 8);
    if (limited.length < 8) {
      throw new Error(`Model returned ${limited.length} stories; expected 8.`);
    }

    const articles: NewsArticle[] = limited.map((item: any, index: number) => ({
      id: String(item?.id ?? `story-${index + 1}`),
      title: String(item?.title ?? ""),
      summary: String(item?.summary ?? ""),
      sport: String(item?.sport ?? "Sports"),
      timeAgo: String(item?.timeAgo ?? "recently"),
      isHot: Boolean(item?.isHot),
      category: String(item?.category ?? "News")
    }));

    newsCache = {
      articles,
      timestamp: Date.now()
    };

    return NextResponse.json({ articles });
  } catch (error) {
    console.log("news route failed full error:", error);
    if (rawModelText) {
      console.log("news route raw model output:", rawModelText);
    }
    newsCache = {
      articles: fallbackArticles,
      timestamp: Date.now()
    };
    return NextResponse.json({ articles: fallbackArticles });
  }
}

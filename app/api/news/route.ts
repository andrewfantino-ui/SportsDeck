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

type NewsApiArticle = {
  title?: string | null;
  description?: string | null;
  content?: string | null;
  source?: { name?: string | null } | null;
  publishedAt?: string | null;
  url?: string | null;
};

const NEWS_CACHE_TTL_MS = 30 * 60 * 1000;
let newsCache:
  | {
      articles: NewsArticle[];
      timestamp: number;
    }
  | null = null;

const fallbackArticles: NewsArticle[] = [
  {
    id: "fallback-1",
    title: "Playoff Seeding Battle Tightens in Pro Basketball",
    summary:
      "Several contenders remain separated by a game as late-season matchups become high leverage. Coaches are shortening rotations and leaning on top scorers in key stretches.",
    sport: "NBA",
    timeAgo: "Today",
    isHot: true,
    category: "Analysis"
  },
  {
    id: "fallback-2",
    title: "Injury Updates Reshape Weekly Football Plans",
    summary:
      "Teams are adjusting depth charts after new status reports on key starters. Coordinators are expected to modify game plans around availability and matchup concerns.",
    sport: "NFL",
    timeAgo: "Today",
    isHot: true,
    category: "Injury"
  },
  {
    id: "fallback-3",
    title: "Title-Race Momentum Swings Across Major Leagues",
    summary:
      "Recent results shifted expectations in multiple leagues and divisions. Analysts point to schedule strength and form trends as deciding factors over the next stretch.",
    sport: "Other",
    timeAgo: "Today",
    isHot: false,
    category: "Breaking"
  }
];

export async function GET() {
  const now = Date.now();
  if (newsCache && now - newsCache.timestamp < NEWS_CACHE_TTL_MS) {
    return NextResponse.json({ articles: newsCache.articles });
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }
    if (!process.env.NEWSAPI_KEY) {
      throw new Error("Missing NEWSAPI_KEY");
    }

    const newsApiUrl = `https://newsapi.org/v2/top-headlines?category=sports&language=en&pageSize=8&apiKey=${encodeURIComponent(process.env.NEWSAPI_KEY)}`;
    const newsApiResponse = await fetch(newsApiUrl, { cache: "no-store" });
    if (!newsApiResponse.ok) {
      const errorBody = await newsApiResponse.text();
      throw new Error(`NewsAPI request failed: ${newsApiResponse.status} ${errorBody}`);
    }

    const newsApiJson = (await newsApiResponse.json()) as {
      articles?: NewsApiArticle[];
    };
    const sourceArticles = Array.isArray(newsApiJson.articles) ? newsApiJson.articles.slice(0, 8) : [];
    if (sourceArticles.length === 0) {
      throw new Error("NewsAPI returned no articles");
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt =
      "Transform these sports news headlines into a JSON array. For each article, assign the sport field based on keywords in the title and content: if it mentions UFC, MMA, fighter, octagon = UFC. If it mentions boxing, boxer, knockout, bout = Boxing. If it mentions hockey, NHL, puck = NHL. If it mentions NBA, basketball = NBA. If it mentions NFL, football = NFL. If the article mentions NCAA, college basketball, March Madness, college football = Other (NOT NBA or NFL). Only assign NBA for professional NBA basketball and NFL for professional NFL football. If it mentions MLB, baseball = MLB. If it mentions soccer, football (non-NFL), Premier League, Champions League, FIFA = Soccer. Otherwise = Other. Return ONLY a raw JSON array with no markdown. Each item needs: id (string), title, summary (2 sentences from the article), sport, timeAgo (based on publishedAt date), isHot (true for 2 most interesting), category.";

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [
        { role: "user", content: prompt },
        { role: "user", content: `Source headlines JSON:\n${JSON.stringify(sourceArticles)}` }
      ]
    } as any);

    let rawText = "";
    for (const block of response.content) {
      if (block.type === "text") rawText += block.text;
    }
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const startIndex = cleaned.indexOf("[");
    if (startIndex === -1) throw new Error("No JSON array found");
    let jsonStr = cleaned.slice(startIndex);
    if (!jsonStr.trimEnd().endsWith("]")) {
      const lastComplete = jsonStr.lastIndexOf("},");
      if (lastComplete !== -1) {
        jsonStr = jsonStr.slice(0, lastComplete + 1) + "]";
      }
    }
    const articles = JSON.parse(jsonStr);
    newsCache = {
      articles,
      timestamp: Date.now()
    };

    return NextResponse.json({ articles });
  } catch (error) {
    console.log(
      "news route failed full error:",
      error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error
    );
    return NextResponse.json({ articles: fallbackArticles });
  }
}

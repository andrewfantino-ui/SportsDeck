type Article = {
  id: string;
  title: string;
  summary: string;
  sport: string;
  timeAgo: string;
  isHot: boolean;
  category: string;
};

type NewsCardProps = {
  article: Article;
  onDebate: (topic: string) => void;
};

const borderBySport: Record<string, string> = {
  NBA: "#3a86ff",
  NFL: "#2ec4b6",
  MLB: "#e63946",
  NHL: "#f4a261",
  SOCCER: "#a8dadc"
};

function getSportKey(rawSport: string) {
  const sport = rawSport.trim().toUpperCase();
  if (sport.includes("NBA") || sport.includes("BASKETBALL")) return "NBA";
  if (sport.includes("NFL") || sport.includes("FOOTBALL")) return "NFL";
  if (sport.includes("MLB") || sport.includes("BASEBALL")) return "MLB";
  if (sport.includes("NHL") || sport.includes("HOCKEY")) return "NHL";
  if (sport.includes("SOCCER")) return "SOCCER";
  return "OTHER";
}

export default function NewsCard({ article, onDebate }: NewsCardProps) {
  const sportKey = getSportKey(article.sport);
  const borderColor = borderBySport[sportKey] ?? "#6b7280";

  return (
    <article
      className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20"
      style={{ borderLeft: `5px solid ${borderColor}` }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-black"
          style={{ backgroundColor: borderColor }}
        >
          {article.sport}
        </span>
        <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs uppercase text-white/75">
          {article.category}
        </span>
        <span className="text-xs text-white/60">{article.timeAgo}</span>
        {article.isHot ? (
          <span className="rounded-full bg-[var(--accent-red)]/20 px-2.5 py-1 text-xs font-bold text-[var(--accent-red)]">
            🔥 HOT
          </span>
        ) : null}
      </div>

      <h2 className="mb-2 text-3xl leading-none text-white">{article.title}</h2>
      <p className="mb-4 text-sm leading-relaxed text-white/80">{article.summary}</p>

      <button
        type="button"
        onClick={() => onDebate(article.title)}
        className="rounded-md bg-[var(--accent-blue)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
      >
        🎤 DEBATE THIS
      </button>
    </article>
  );
}

import Link from "next/link";
import { getInsightData, getAllPosts } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tags — Saved Collections",
  description: "Browse your saved posts by hashtag, category, and keyword.",
};

export default function TagsPage() {
  const insights = getInsightData();
  const posts = getAllPosts();

  // Aggregate all keywords across posts
  const keywordCounts: Record<string, number> = {};
  for (const post of posts) {
    for (const kw of post.keywords) {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    }
  }
  const sortedKeywords = Object.entries(keywordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 40);
  const maxKw = sortedKeywords[0]?.[1] || 1;

  return (
    <div className="container">
      <section className="hero" style={{ paddingBottom: "var(--space-6)" }}>
        <h1>Browse by Tag</h1>
        <p className="hero-subtitle">
          Explore your saved posts through hashtags, AI categories, and extracted keywords.
        </p>
      </section>

      {/* Hashtag Cloud */}
      <section style={{ marginBottom: "var(--space-16)" }}>
        <div className="section-header">
          <h2 className="section-title">🏷️ Hashtags</h2>
        </div>
        <div className="tag-cloud">
          {insights.topHashtags.map((h) => {
            const maxTag = insights.topHashtags[0]?.count || 1;
            const scale = 0.75 + (h.count / maxTag) * 0.75;
            return (
              <span
                key={h.tag}
                className="tag-cloud-item"
                style={{ fontSize: `${scale}rem` }}
              >
                #{h.tag}
                <span style={{ opacity: 0.5, marginLeft: "var(--space-1)", fontSize: "0.75em" }}>
                  {h.count}
                </span>
              </span>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section style={{ marginBottom: "var(--space-16)" }}>
        <div className="section-header">
          <h2 className="section-title">📁 Categories</h2>
        </div>
        <div className="collection-grid stagger-children">
          {insights.categoryDistribution.map((cat, i) => {
            const gradients = [
              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
              "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
              "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
              "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
            ];
            return (
              <div
                key={cat.category}
                className="collection-card"
                style={{ cursor: "default" }}
              >
                <div
                  className="collection-card-cover"
                  style={{
                    height: 120,
                    background: gradients[i % gradients.length],
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <span style={{ fontSize: "2.5rem", opacity: 0.7 }}>
                    {categoryEmoji(cat.category)}
                  </span>
                </div>
                <div className="collection-card-body">
                  <h3 className="collection-card-name">{cat.category}</h3>
                  <p className="collection-card-summary" style={{ WebkitLineClamp: 1 }}>
                    {cat.count} saved post{cat.count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Keywords */}
      <section style={{ marginBottom: "var(--space-16)" }}>
        <div className="section-header">
          <h2 className="section-title">🔑 Keywords</h2>
          <p className="section-subtitle">AI-extracted keywords from your posts</p>
        </div>
        <div className="tag-cloud">
          {sortedKeywords.map(([kw, count]) => {
            const scale = 0.7 + (count / maxKw) * 0.8;
            return (
              <span
                key={kw}
                className="tag-cloud-item"
                style={{ fontSize: `${scale}rem` }}
              >
                {kw}
                <span style={{ opacity: 0.5, marginLeft: "var(--space-1)", fontSize: "0.75em" }}>
                  {count}
                </span>
              </span>
            );
          })}
        </div>
      </section>

      {/* Moods */}
      <section>
        <div className="section-header">
          <h2 className="section-title">🎨 Moods</h2>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", justifyContent: "center" }}>
          {insights.moodDistribution.map((m) => (
            <div
              key={m.mood}
              className={`mood-badge mood-${m.mood}`}
              style={{
                padding: "var(--space-3) var(--space-6)",
                fontSize: "var(--text-base)",
                borderRadius: "var(--radius-xl)",
              }}
            >
              {m.mood} · {m.count}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function categoryEmoji(category: string): string {
  const map: Record<string, string> = {
    Travel: "✈️", Food: "🍽️", Design: "🎨", Tech: "💻", Art: "🖼️",
    Fashion: "👗", Fitness: "💪", Nature: "🌿", Music: "🎵",
    Photography: "📸", Architecture: "🏛️", Motivation: "🔥",
    Lifestyle: "✨", Beauty: "💄", Science: "🔬", Books: "📚",
    DIY: "🔧", Humor: "😂", Other: "📌",
  };
  return map[category] || "📌";
}

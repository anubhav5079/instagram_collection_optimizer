import { getInsightData, getDBStats } from "@/lib/db";
import { formatNumber } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insights — Saved Collections",
  description: "Analytics and insights from your saved Instagram posts.",
};

const CHART_COLORS = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#14b8a6",
  "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899",
  "#a855f7", "#84cc16",
];

export default function InsightsPage() {
  const insights = getInsightData();
  const stats = getDBStats();

  // Donut chart data
  const typeTotal = insights.postTypeBreakdown.reduce((sum, t) => sum + t.count, 0);
  let cumulative = 0;
  const conicStops = insights.postTypeBreakdown.map((t, i) => {
    const start = cumulative;
    cumulative += (t.count / typeTotal) * 100;
    return `${CHART_COLORS[i % CHART_COLORS.length]} ${start}% ${cumulative}%`;
  }).join(", ");

  const maxHashtag = insights.topHashtags[0]?.count || 1;

  return (
    <div className="container">
      <section className="hero" style={{ paddingBottom: "var(--space-6)" }}>
        <h1>Insights</h1>
        <p className="hero-subtitle">
          A deeper look at your saved content — trends, favorites, and patterns.
        </p>
      </section>

      {/* Quick stats */}
      <div className="stats-bar" style={{ marginBottom: "var(--space-12)" }}>
        <div className="stat-item">
          <div className="stat-value">{formatNumber(stats.collections)}</div>
          <div className="stat-label">Collections</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatNumber(stats.total_posts)}</div>
          <div className="stat-label">Total Posts</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatNumber(stats.enriched)}</div>
          <div className="stat-label">AI Enriched</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatNumber(stats.duplicates)}</div>
          <div className="stat-label">Cross-Saved</div>
        </div>
      </div>

      <div className="insights-grid">
        {/* Top Hashtags */}
        <div className="insight-card" style={{ animationDelay: "0.1s" }}>
          <h3 className="insight-card-title">🏷️ Top Hashtags</h3>
          <div className="bar-chart">
            {insights.topHashtags.slice(0, 10).map((h) => (
              <div className="bar-chart-row" key={h.tag}>
                <span className="bar-chart-label">#{h.tag}</span>
                <div className="bar-chart-track">
                  <div
                    className="bar-chart-fill"
                    style={{ width: `${Math.max((h.count / maxHashtag) * 100, 15)}%` }}
                  >
                    {h.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Post Type Breakdown */}
        <div className="insight-card" style={{ animationDelay: "0.2s" }}>
          <h3 className="insight-card-title">📊 Post Types</h3>
          <div
            className="donut-chart"
            style={{ background: `conic-gradient(${conicStops})` }}
          >
            <div className="donut-chart-inner">
              <span className="donut-chart-total">{typeTotal}</span>
            </div>
          </div>
          <div className="donut-legend">
            {insights.postTypeBreakdown.map((t, i) => (
              <div className="donut-legend-item" key={t.type}>
                <div
                  className="donut-legend-color"
                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span style={{ textTransform: "capitalize" }}>
                  {t.type} ({t.count})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Saved Authors */}
        <div className="insight-card" style={{ animationDelay: "0.3s" }}>
          <h3 className="insight-card-title">👤 Most Saved Authors</h3>
          <div className="ranked-list">
            {insights.topAuthors.map((a, i) => (
              <div className="ranked-list-item" key={a.handle}>
                <span className="ranked-list-rank">{i + 1}</span>
                <span className="ranked-list-name">@{a.handle}</span>
                <span className="ranked-list-count">{a.count} posts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mood Distribution */}
        <div className="insight-card" style={{ animationDelay: "0.4s" }}>
          <h3 className="insight-card-title">🎨 Mood Distribution</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
            {insights.moodDistribution.map((m) => (
              <div
                key={m.mood}
                className={`mood-badge mood-${m.mood}`}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  fontSize: "var(--text-sm)",
                }}
              >
                {m.mood} ({m.count})
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="insight-card" style={{ animationDelay: "0.5s" }}>
          <h3 className="insight-card-title">📁 Categories</h3>
          <div className="ranked-list">
            {insights.categoryDistribution.map((c, i) => (
              <div className="ranked-list-item" key={c.category}>
                <span className="ranked-list-rank">{i + 1}</span>
                <span className="ranked-list-name">{c.category}</span>
                <span className="ranked-list-count">{c.count} posts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Save Timeline */}
        {insights.timeline.length > 0 && (
          <div className="insight-card" style={{ animationDelay: "0.6s" }}>
            <h3 className="insight-card-title">📈 Save Timeline</h3>
            <div className="bar-chart">
              {insights.timeline.map((t) => {
                const maxMonth = Math.max(...insights.timeline.map(x => x.count));
                return (
                  <div className="bar-chart-row" key={t.month}>
                    <span className="bar-chart-label">{t.month}</span>
                    <div className="bar-chart-track">
                      <div
                        className="bar-chart-fill"
                        style={{ width: `${Math.max((t.count / maxMonth) * 100, 10)}%` }}
                      >
                        {t.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

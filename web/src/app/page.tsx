import Link from "next/link";
import { getAllCollections, getDBStats } from "@/lib/db";
import { formatNumber, truncate, moodEmoji } from "@/lib/utils";
import type { Collection } from "@/lib/types";
import { Bookmark, Image, Film, Layers, FileText } from "lucide-react";

export default function HomePage() {
  const collections = getAllCollections();
  const stats = getDBStats();

  return (
    <div className="container">
      {/* Hero */}
      <section className="hero">
        <h1>Your Saved Universe</h1>
        <p className="hero-subtitle">
          Every post you&apos;ve bookmarked on Instagram — organized, enriched with AI,
          and searchable. Your personal content library.
        </p>

        <div className="stats-bar">
          <StatItem icon={<Bookmark size={18} />} value={stats.collections} label="Collections" />
          <StatItem icon={<Image size={18} />} value={stats.images + stats.carousels} label="Images" />
          <StatItem icon={<Film size={18} />} value={stats.videos} label="Videos" />
          <StatItem icon={<FileText size={18} />} value={stats.transcripts} label="Transcripts" />
          <StatItem icon={<Layers size={18} />} value={stats.total_posts} label="Total Posts" />
        </div>
      </section>

      {/* Collections Grid */}
      <section>
        <div className="section-header">
          <div>
            <h2 className="section-title">Collections</h2>
            <p className="section-subtitle">
              {collections.length} saved collections, {stats.total_posts} posts total
            </p>
          </div>
        </div>

        <div className="collection-grid stagger-children">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}

          {collections.length === 0 && (
            <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
              <div className="empty-state-icon">📚</div>
              <h3 className="empty-state-title">No collections yet</h3>
              <p className="empty-state-text">
                Run the scraping agent to pull in your saved Instagram collections.
                Check the README for setup instructions.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="stat-item">
      <div className="stat-icon" aria-hidden="true">{icon}</div>
      <div className="stat-value">{formatNumber(value)}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const coverGradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  ];
  const gradient = coverGradients[collection.id % coverGradients.length];

  return (
    <Link href={`/collections/${collection.slug}`} className="collection-card" id={`collection-${collection.slug}`}>
      <div className="collection-card-cover">
        {collection.cover_image_path ? (
          <img
            src={collection.cover_image_path}
            alt={collection.name}
            className="collection-card-cover-image"
            loading="lazy"
          />
        ) : (
          <div
            className="collection-card-cover-placeholder"
            style={{ background: gradient }}
          >
            <Bookmark size={40} color="rgba(255,255,255,0.4)" />
          </div>
        )}
        <div className="collection-card-cover-overlay" />
        <span className="collection-card-count">
          {collection.post_count} posts
        </span>
      </div>
      <div className="collection-card-body">
        <h3 className="collection-card-name">{collection.name}</h3>
        {collection.summary && (
          <p className="collection-card-summary">{truncate(collection.summary, 100)}</p>
        )}
        <div className="collection-card-tags">
          {collection.top_tags.slice(0, 4).map((tag) => (
            <span key={tag} className="tag">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

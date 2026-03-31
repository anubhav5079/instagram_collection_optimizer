import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCollectionSlugs, getCollectionBySlug, getPostsByCollection } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import { CollectionGrid } from "@/components/CollectionGrid";

export async function generateStaticParams() {
  const slugs = getAllCollectionSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) return { title: "Collection Not Found" };
  return {
    title: `${collection.name} — Saved Collections`,
    description: collection.summary || `${collection.post_count} saved posts in ${collection.name}`,
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) notFound();

  const posts = getPostsByCollection(collection.id);

  return (
    <div className="container">
      {/* Back button */}
      <Link href="/" className="post-detail-back">
        <ArrowLeft size={16} />
        All Collections
      </Link>

      {/* Collection header */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ marginBottom: "var(--space-3)" }}>{collection.name}</h1>
        {collection.summary && (
          <p style={{ color: "var(--text-secondary)", maxWidth: 700, lineHeight: 1.7, marginBottom: "var(--space-4)" }}>
            {collection.summary}
          </p>
        )}
        <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
            {posts.length} posts
          </span>
          {collection.top_tags.slice(0, 6).map((tag) => (
            <span key={tag} className="tag tag-accent">#{tag}</span>
          ))}
        </div>
      </div>

      {/* Interactive filtered grid */}
      <CollectionGrid posts={posts} />

      {posts.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3 className="empty-state-title">No posts in this collection</h3>
          <p className="empty-state-text">
            This collection appears to be empty or hasn&apos;t been scraped yet.
          </p>
        </div>
      )}
    </div>
  );
}

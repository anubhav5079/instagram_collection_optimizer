import { buildSearchIndex } from "@/lib/db";
import { SearchClient } from "@/components/SearchClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search — Saved Collections",
  description: "Full-text search across all your saved Instagram posts.",
};

export default function SearchPage() {
  // Build search index at SSG time — passed to client component
  const searchIndex = buildSearchIndex();

  return (
    <div className="container">
      <section className="hero" style={{ paddingBottom: "var(--space-6)" }}>
        <h1>Search</h1>
        <p className="hero-subtitle">
          Find anything across your saved posts — captions, transcripts, hashtags, and more.
        </p>
      </section>

      <SearchClient posts={searchIndex} />
    </div>
  );
}

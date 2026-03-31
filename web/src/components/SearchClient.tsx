"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Image, Film, Heart, MessageCircle } from "lucide-react";

interface SearchablePost {
  id: number;
  caption: string;
  hashtags: string;
  author: string;
  transcript: string;
  keywords: string;
  summary: string;
  collection_name: string;
  media_type: string;
  thumbnail: string;
  mood: string;
  category: string;
}

export function SearchClient({ posts }: { posts: SearchablePost[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];

    const q = query.toLowerCase();
    return posts.filter((p) => {
      const searchable = [
        p.caption, p.hashtags, p.author, p.transcript,
        p.keywords, p.summary, p.collection_name, p.category
      ].join(" ").toLowerCase();
      return searchable.includes(q);
    }).slice(0, 50);
  }, [query, posts]);

  return (
    <>
      <div className="search-container">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search captions, transcripts, tags, authors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            id="search-input"
          />
        </div>
      </div>

      {query.length >= 2 && (
        <p className="search-results-count">
          {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
        </p>
      )}

      <div className="masonry-grid stagger-children">
        {results.map((post) => (
          <Link
            key={post.id}
            href={`/post/${post.id}`}
            className="post-card"
            id={`search-result-${post.id}`}
          >
            <div className="post-card-image-wrapper">
              {post.thumbnail ? (
                <img
                  src={post.thumbnail}
                  alt={post.caption || "Post"}
                  className="post-card-image"
                  loading="lazy"
                />
              ) : (
                <div
                  className="post-card-image-placeholder"
                  style={{
                    background: `linear-gradient(135deg, hsl(${(post.id * 37) % 360}, 60%, 30%) 0%, hsl(${(post.id * 73) % 360}, 60%, 20%) 100%)`,
                  }}
                >
                  {post.media_type === "video" || post.media_type === "reel" ? "🎬" : "📷"}
                </div>
              )}
              <span className="post-card-type-badge">
                {post.media_type === "video" || post.media_type === "reel" ? <Film size={12} /> : <Image size={12} />}
                {post.media_type}
              </span>
            </div>
            <div className="post-card-body">
              {post.author && (
                <div className="post-card-author">@{post.author}</div>
              )}
              <p className="post-card-caption">
                {highlightMatch(post.caption || post.summary || "", query)}
              </p>
              {post.category && (
                <span className="tag tag-accent" style={{ marginTop: "var(--space-2)" }}>
                  {post.category}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {query.length >= 2 && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">No results found</h3>
          <p className="empty-state-text">
            Try a different search term or browse by tags and collections.
          </p>
        </div>
      )}

      {query.length < 2 && (
        <div className="empty-state">
          <div className="empty-state-icon">✨</div>
          <h3 className="empty-state-title">Search your saves</h3>
          <p className="empty-state-text">
            Find posts by caption, transcript, hashtag, author, or keyword.
            Start typing at least 2 characters.
          </p>
        </div>
      )}
    </>
  );
}

function highlightMatch(text: string, query: string): string {
  if (!query || !text) return text.slice(0, 150);
  // Just truncate around the match for display
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 150);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}

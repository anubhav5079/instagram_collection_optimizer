"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Image, Images, Video, Film, Heart, MessageCircle,
} from "lucide-react";
import { truncate, formatNumber, moodEmoji, getPostImagePath } from "@/lib/utils";
import type { Post } from "@/lib/types";

interface CollectionGridProps {
  posts: Post[];
}

const MEDIA_TYPES = ["all", "image", "carousel", "video", "reel"] as const;

export function CollectionGrid({ posts }: CollectionGridProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [moodFilter, setMoodFilter] = useState<string>("all");

  // Extract unique moods from posts
  const availableMoods = useMemo(() => {
    const moods = new Set<string>();
    for (const p of posts) {
      if (p.mood) moods.add(p.mood);
    }
    return Array.from(moods).sort();
  }, [posts]);

  // Filter posts
  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (typeFilter !== "all" && p.media_type !== typeFilter) return false;
      if (moodFilter !== "all" && p.mood !== moodFilter) return false;
      return true;
    });
  }, [posts, typeFilter, moodFilter]);

  return (
    <>
      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: "var(--space-8)" }}>
        {MEDIA_TYPES.map((type) => (
          <button
            key={type}
            className={`filter-pill ${typeFilter === type ? "active" : ""}`}
            onClick={() => setTypeFilter(type)}
          >
            {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
            {type !== "all" && (
              <span style={{ opacity: 0.6, marginLeft: 4, fontSize: "0.85em" }}>
                {posts.filter((p) => p.media_type === type).length}
              </span>
            )}
          </button>
        ))}

        {availableMoods.length > 0 && (
          <>
            <span style={{
              width: 1,
              height: 24,
              background: "var(--border-secondary)",
              margin: "0 var(--space-2)",
              alignSelf: "center",
            }} />
            <button
              className={`filter-pill ${moodFilter === "all" ? "active" : ""}`}
              onClick={() => setMoodFilter("all")}
            >
              All Moods
            </button>
            {availableMoods.map((mood) => (
              <button
                key={mood}
                className={`filter-pill ${moodFilter === mood ? "active" : ""}`}
                onClick={() => setMoodFilter(mood)}
              >
                {moodEmoji(mood)} {mood}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Result count */}
      {(typeFilter !== "all" || moodFilter !== "all") && (
        <p style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-tertiary)",
          marginBottom: "var(--space-6)",
        }}>
          Showing {filtered.length} of {posts.length} posts
        </p>
      )}

      {/* Posts masonry grid */}
      <div className="masonry-grid stagger-children">
        {filtered.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">No matching posts</h3>
          <p className="empty-state-text">
            Try adjusting your filters to see more results.
          </p>
        </div>
      )}
    </>
  );
}

function PostCard({ post }: { post: Post }) {
  const imagePath = getPostImagePath(post);
  const isVideo = post.media_type === "video" || post.media_type === "reel";
  const typeIcon = {
    image: <Image size={12} />,
    carousel: <Images size={12} />,
    video: <Video size={12} />,
    reel: <Film size={12} />,
  }[post.media_type] || <Image size={12} />;

  return (
    <Link href={`/post/${post.id}`} className="post-card" id={`post-card-${post.id}`}>
      <div className="post-card-image-wrapper">
        {imagePath ? (
          <>
            <img
              src={imagePath}
              alt={post.alt_text || post.caption || "Instagram post"}
              className="post-card-image"
              loading="lazy"
            />
            {isVideo && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 0,
                  height: 0,
                  borderLeft: '16px solid white',
                  borderTop: '10px solid transparent',
                  borderBottom: '10px solid transparent',
                  marginLeft: 4,
                }} />
              </div>
            )}
          </>
        ) : (
          <div className="post-card-image-placeholder" style={{
            background: `linear-gradient(135deg, hsl(${(post.id * 37) % 360}, 60%, 30%) 0%, hsl(${(post.id * 73) % 360}, 60%, 20%) 100%)`
          }}>
            {post.media_type === "video" || post.media_type === "reel" ? "🎬" : "📷"}
          </div>
        )}
        <span className="post-card-type-badge">
          {typeIcon}
          {post.media_type}
        </span>
      </div>
      <div className="post-card-body">
        {post.author_handle && (
          <div className="post-card-author">@{post.author_handle}</div>
        )}
        {(post.caption || post.ai_summary) && (
          <p className="post-card-caption">
            {truncate(post.caption || post.ai_summary || "", 120)}
          </p>
        )}
        <div className="post-card-footer">
          <div className="post-card-meta">
            {post.like_count != null && (
              <span className="post-card-meta-item">
                <Heart size={12} /> {formatNumber(post.like_count)}
              </span>
            )}
            {post.comment_count != null && (
              <span className="post-card-meta-item">
                <MessageCircle size={12} /> {formatNumber(post.comment_count)}
              </span>
            )}
          </div>
          {post.mood && (
            <span className={`mood-badge mood-${post.mood}`}>
              {moodEmoji(post.mood)} {post.mood}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

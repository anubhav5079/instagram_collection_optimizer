import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPostIds, getPostById } from "@/lib/db";
import { formatDate, formatNumber, moodEmoji, getPostImagePath } from "@/lib/utils";
import type { PostWithCollections } from "@/lib/types";
import {
  ArrowLeft, Download, ExternalLink, Heart, MessageCircle,
  MapPin, Calendar, Tag, Bookmark, FileText, Eye
} from "lucide-react";

export async function generateStaticParams() {
  const ids = getAllPostIds();
  return ids.map((id) => ({ id: String(id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getPostById(Number(id));
  if (!post) return { title: "Post Not Found" };
  return {
    title: `${post.author_handle ? `@${post.author_handle}` : "Post"} — Saved Collections`,
    description: post.ai_summary || post.caption?.slice(0, 160) || "Saved Instagram post",
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getPostById(Number(id));
  if (!post) notFound();

  const isVideo = post.media_type === "video" || post.media_type === "reel";
  const imagePath = isVideo ? post.thumbnail_url : (post.media_urls[0] || post.thumbnail_url);
  const allImages = post.media_urls || [];

  return (
    <div className="container">
      <div className="post-detail">
        {/* Back */}
        <Link href="/" className="post-detail-back">
          <ArrowLeft size={16} />
          Back
        </Link>

        {/* Media */}
        {isVideo && post.video_url ? (
          <div className="post-detail-media">
            <video
              controls
              autoPlay
              loop
              playsInline
              className="post-detail-image"
              poster={post.thumbnail_url || undefined}
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            >
              <source src={post.video_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        ) : imagePath ? (
          <div className="post-detail-media">
            <img
              src={imagePath}
              alt={post.alt_text || post.caption || "Instagram post"}
              className="post-detail-image"
            />
          </div>
        ) : null}

        {/* Carousel: additional images */}
        {allImages.length > 1 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "var(--space-4)",
            marginBottom: "var(--space-8)",
          }}>
            {allImages.slice(1).map((path, i) => (
              <div key={i} style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border-secondary)" }}>
                <img src={path} alt={`Image ${i + 2}`} style={{ width: "100%", display: "block" }} />
              </div>
            ))}
          </div>
        )}

        {/* Content grid */}
        <div className="post-detail-content">
          {/* Main content */}
          <div className="post-detail-main">
            {/* Author */}
            <div className="post-detail-author">
              <div className="post-detail-author-avatar">
                {(post.author_handle || "?")[0].toUpperCase()}
              </div>
              <div className="post-detail-author-info">
                <div className="post-detail-author-handle">
                  @{post.author_handle || "unknown"}
                </div>
                {post.author_name && (
                  <div className="post-detail-author-name">{post.author_name}</div>
                )}
              </div>
            </div>

            {/* Caption */}
            {post.caption && (
              <div className="post-detail-caption">{post.caption}</div>
            )}

            {/* Transcript (video posts) */}
            {isVideo && post.transcript && (
              <div className="post-detail-transcript">
                <div className="post-detail-transcript-label">
                  <FileText size={14} />
                  {post.transcript_source === "whisper"
                    ? "Audio Transcript"
                    : post.transcript_source === "vision"
                    ? "Scene Description"
                    : "Content Note"}
                </div>
                <div className="post-detail-transcript-text">{post.transcript}</div>
              </div>
            )}

            {/* AI Summary */}
            {post.ai_summary && (
              <div className="post-detail-summary">
                <div className="post-detail-summary-label">✨ AI Summary</div>
                <div className="post-detail-summary-text">{post.ai_summary}</div>
              </div>
            )}

            {/* Tags */}
            {post.hashtags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
                {post.hashtags.map((tag) => (
                  <span key={tag} className="tag">#{tag}</span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              {post.permalink && (
                <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <ExternalLink size={16} />
                  View on Instagram
                </a>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="post-detail-sidebar">
            {/* Engagement */}
            <div className="sidebar-card">
              <div className="sidebar-card-title">Engagement</div>
              <div className="sidebar-stat">
                <span className="sidebar-stat-label"><Heart size={14} style={{ verticalAlign: "middle" }} /> Likes</span>
                <span className="sidebar-stat-value">{formatNumber(post.like_count)}</span>
              </div>
              <div className="sidebar-stat">
                <span className="sidebar-stat-label"><MessageCircle size={14} style={{ verticalAlign: "middle" }} /> Comments</span>
                <span className="sidebar-stat-value">{formatNumber(post.comment_count)}</span>
              </div>
            </div>

            {/* Details */}
            <div className="sidebar-card">
              <div className="sidebar-card-title">Details</div>
              {post.date_posted && (
                <div className="sidebar-stat">
                  <span className="sidebar-stat-label"><Calendar size={14} style={{ verticalAlign: "middle" }} /> Posted</span>
                  <span className="sidebar-stat-value">{formatDate(post.date_posted)}</span>
                </div>
              )}
              {post.location && (
                <div className="sidebar-stat">
                  <span className="sidebar-stat-label"><MapPin size={14} style={{ verticalAlign: "middle" }} /> Location</span>
                  <span className="sidebar-stat-value">{post.location}</span>
                </div>
              )}
              <div className="sidebar-stat">
                <span className="sidebar-stat-label"><Eye size={14} style={{ verticalAlign: "middle" }} /> Type</span>
                <span className="sidebar-stat-value" style={{ textTransform: "capitalize" }}>{post.media_type}</span>
              </div>
            </div>

            {/* AI Enrichment */}
            {(post.category || post.mood || post.keywords.length > 0) && (
              <div className="sidebar-card">
                <div className="sidebar-card-title">AI Analysis</div>
                {post.category && (
                  <div className="sidebar-stat">
                    <span className="sidebar-stat-label"><Tag size={14} style={{ verticalAlign: "middle" }} /> Category</span>
                    <span className="sidebar-stat-value">{post.category}</span>
                  </div>
                )}
                {post.mood && (
                  <div className="sidebar-stat">
                    <span className="sidebar-stat-label">Mood</span>
                    <span className={`mood-badge mood-${post.mood}`}>
                      {moodEmoji(post.mood)} {post.mood}
                    </span>
                  </div>
                )}
                {post.keywords.length > 0 && (
                  <div style={{ marginTop: "var(--space-3)" }}>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
                      Keywords
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
                      {post.keywords.map((kw) => (
                        <span key={kw} className="tag">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Collections */}
            {post.collections.length > 0 && (
              <div className="sidebar-card">
                <div className="sidebar-card-title">
                  <Bookmark size={14} style={{ verticalAlign: "middle" }} /> Saved In
                </div>
                {post.collections.map((c) => (
                  <Link
                    key={c.id}
                    href={`/collections/${c.slug}`}
                    style={{
                      display: "block",
                      padding: "var(--space-2) var(--space-3)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                      transition: "all var(--transition-fast)",
                    }}
                    className="ranked-list-item"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

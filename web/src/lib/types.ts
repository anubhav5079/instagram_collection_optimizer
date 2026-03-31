/**
 * TypeScript types for the Instagram Saved Collections website.
 */

export interface Collection {
  id: number;
  instagram_id: string;
  name: string;
  slug: string;
  cover_image_path: string | null;
  post_count: number;
  summary: string | null;
  top_tags: string[]; // Parsed from JSON
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: number;
  instagram_post_id: string;
  media_type: 'image' | 'carousel' | 'video' | 'reel';
  caption: string | null;
  hashtags: string[]; // Parsed from JSON
  author_handle: string | null;
  author_name: string | null;
  permalink: string | null;
  date_posted: string | null;
  date_saved: string | null;
  like_count: number | null;
  comment_count: number | null;
  location: string | null;
  alt_text: string | null;
  media_urls: string[]; // Direct Instagram URLs (parsed from JSON)
  thumbnail_url: string | null; // Direct Instagram thumbnail URL
  video_url: string | null; // Direct Instagram video URL
  transcript: string | null;
  transcript_source: 'whisper' | 'vision' | 'none' | null;
  category: string | null;
  keywords: string[]; // Parsed from JSON
  mood: string | null;
  ai_summary: string | null;
  is_duplicate: boolean;
  duplicate_in: string[]; // Parsed from JSON
  scrape_status: string;
  enrichment_status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostWithCollections extends Post {
  collections: Collection[];
}

export interface DBStats {
  collections: number;
  total_posts: number;
  images: number;
  carousels: number;
  videos: number;
  transcripts: number;
  enriched: number;
  failed: number;
  duplicates: number;
}

export interface InsightData {
  topHashtags: { tag: string; count: number }[];
  topAuthors: { handle: string; count: number }[];
  postTypeBreakdown: { type: string; count: number }[];
  moodDistribution: { mood: string; count: number }[];
  categoryDistribution: { category: string; count: number }[];
  timeline: { month: string; count: number }[];
}

export interface SearchIndex {
  posts: SearchablePost[];
}

export interface SearchablePost {
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

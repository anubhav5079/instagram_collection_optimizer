/**
 * SQLite database access layer — read-only at build time.
 * Uses better-sqlite3 to query the scraped data for static page generation.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Collection, Post, PostWithCollections, DBStats, InsightData, SearchablePost } from './types';
import { parseJsonArray } from './utils';

// Resolve the database path
const DB_PATH = path.join(process.cwd(), 'data', 'instagram.db');

/**
 * Get a read-only database connection.
 * Returns null if the database file doesn't exist (first build before scraping).
 * Also returns null if better-sqlite3 bindings aren't available (preview environment).
 */
function getDb(): Database.Database | null {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.warn(`Database not found at ${DB_PATH} — using demo data`);
      return null;
    }
    return new Database(DB_PATH, { readonly: true });
  } catch (err) {
    // better-sqlite3 bindings not available (common in preview/serverless environments)
    // Fall back to demo data
    console.warn(`Database unavailable: ${err instanceof Error ? err.message : 'unknown error'} — using demo data`);
    return null;
  }
}

/**
 * Parse a raw DB row into a typed Collection object.
 */
function parseCollection(row: Record<string, unknown>): Collection {
  return {
    ...row,
    top_tags: parseJsonArray(row.top_tags as string),
  } as Collection;
}

/**
 * Parse a raw DB row into a typed Post object.
 */
function parsePost(row: Record<string, unknown>): Post {
  return {
    ...row,
    hashtags: parseJsonArray(row.hashtags as string),
    media_urls: parseJsonArray(row.media_urls as string),
    keywords: parseJsonArray(row.keywords as string),
    duplicate_in: parseJsonArray(row.duplicate_in as string),
    is_duplicate: Boolean(row.is_duplicate),
  } as Post;
}

// ══════════════════════════════════════════════════════════════
// Collections
// ══════════════════════════════════════════════════════════════

export function getAllCollections(): Collection[] {
  const db = getDb();
  if (!db) return getDemoCollections();
  try {
    const rows = db.prepare('SELECT * FROM collections ORDER BY name').all();
    return (rows as Record<string, unknown>[]).map(parseCollection);
  } finally {
    db.close();
  }
}

export function getCollectionBySlug(slug: string): Collection | null {
  const db = getDb();
  if (!db) return getDemoCollections().find(c => c.slug === slug) || null;
  try {
    const row = db.prepare('SELECT * FROM collections WHERE slug = ?').get(slug);
    return row ? parseCollection(row as Record<string, unknown>) : null;
  } finally {
    db.close();
  }
}

export function getAllCollectionSlugs(): string[] {
  const db = getDb();
  if (!db) return getDemoCollections().map(c => c.slug);
  try {
    const rows = db.prepare('SELECT slug FROM collections').all() as { slug: string }[];
    return rows.map(r => r.slug);
  } finally {
    db.close();
  }
}

// ══════════════════════════════════════════════════════════════
// Posts
// ══════════════════════════════════════════════════════════════

export function getPostsByCollection(collectionId: number): Post[] {
  const db = getDb();
  if (!db) return getDemoPosts();
  try {
    const rows = db.prepare(`
      SELECT p.* FROM posts p
      JOIN post_collections pc ON p.id = pc.post_id
      WHERE pc.collection_id = ? AND p.scrape_status = 'complete'
      ORDER BY p.date_posted DESC
    `).all(collectionId);
    return (rows as Record<string, unknown>[]).map(parsePost);
  } finally {
    db.close();
  }
}

export function getPostById(id: number): PostWithCollections | null {
  const db = getDb();
  if (!db) {
    const post = getDemoPosts().find(p => p.id === id);
    return post ? { ...post, collections: getDemoCollections() } : null;
  }
  try {
    const row = db.prepare("SELECT * FROM posts WHERE id = ? AND scrape_status = 'complete'").get(id);
    if (!row) return null;

    const post = parsePost(row as Record<string, unknown>);

    // Get associated collections
    const collRows = db.prepare(`
      SELECT c.* FROM collections c
      JOIN post_collections pc ON c.id = pc.collection_id
      WHERE pc.post_id = ?
    `).all(id);
    const collections = (collRows as Record<string, unknown>[]).map(parseCollection);

    return { ...post, collections };
  } finally {
    db.close();
  }
}

export function getAllPostIds(): number[] {
  const db = getDb();
  if (!db) return getDemoPosts().map(p => p.id);
  try {
    const rows = db.prepare("SELECT id FROM posts WHERE scrape_status = 'complete'").all() as { id: number }[];
    return rows.map(r => r.id);
  } finally {
    db.close();
  }
}

export function getAllPosts(): Post[] {
  const db = getDb();
  if (!db) return getDemoPosts();
  try {
    const rows = db.prepare("SELECT * FROM posts WHERE scrape_status = 'complete' ORDER BY date_posted DESC").all();
    return (rows as Record<string, unknown>[]).map(parsePost);
  } finally {
    db.close();
  }
}

// ══════════════════════════════════════════════════════════════
// Stats & Insights
// ══════════════════════════════════════════════════════════════

export function getDBStats(): DBStats {
  const db = getDb();
  if (!db) return getDemoStats();
  try {
    const get = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
    return {
      collections: get('SELECT COUNT(*) as n FROM collections'),
      total_posts: get("SELECT COUNT(*) as n FROM posts WHERE scrape_status = 'complete'"),
      images: get("SELECT COUNT(*) as n FROM posts WHERE media_type = 'image' AND scrape_status = 'complete'"),
      carousels: get("SELECT COUNT(*) as n FROM posts WHERE media_type = 'carousel' AND scrape_status = 'complete'"),
      videos: get("SELECT COUNT(*) as n FROM posts WHERE media_type IN ('video', 'reel') AND scrape_status = 'complete'"),
      transcripts: get("SELECT COUNT(*) as n FROM posts WHERE transcript IS NOT NULL AND transcript != ''"),
      enriched: get("SELECT COUNT(*) as n FROM posts WHERE enrichment_status = 'complete'"),
      failed: get("SELECT COUNT(*) as n FROM posts WHERE scrape_status = 'failed'"),
      duplicates: get("SELECT COUNT(*) as n FROM posts WHERE is_duplicate = 1"),
    };
  } finally {
    db.close();
  }
}

export function getInsightData(): InsightData {
  const db = getDb();
  if (!db) return getDemoInsights();
  try {
    // Top hashtags — parse JSON arrays and count
    const posts = db.prepare("SELECT hashtags FROM posts WHERE scrape_status = 'complete' AND hashtags IS NOT NULL").all() as { hashtags: string }[];
    const tagCounts: Record<string, number> = {};
    for (const p of posts) {
      const tags = parseJsonArray(p.hashtags);
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    const topHashtags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }));

    // Top authors
    const authorRows = db.prepare(`
      SELECT author_handle, COUNT(*) as count FROM posts
      WHERE scrape_status = 'complete' AND author_handle IS NOT NULL AND author_handle != ''
      GROUP BY author_handle ORDER BY count DESC LIMIT 10
    `).all() as { author_handle: string; count: number }[];
    const topAuthors = authorRows.map(r => ({ handle: r.author_handle, count: r.count }));

    // Post type breakdown
    const typeRows = db.prepare(`
      SELECT media_type, COUNT(*) as count FROM posts
      WHERE scrape_status = 'complete' GROUP BY media_type
    `).all() as { media_type: string; count: number }[];
    const postTypeBreakdown = typeRows.map(r => ({ type: r.media_type, count: r.count }));

    // Mood distribution
    const moodRows = db.prepare(`
      SELECT mood, COUNT(*) as count FROM posts
      WHERE scrape_status = 'complete' AND mood IS NOT NULL
      GROUP BY mood ORDER BY count DESC
    `).all() as { mood: string; count: number }[];
    const moodDistribution = moodRows.map(r => ({ mood: r.mood, count: r.count }));

    // Category distribution
    const catRows = db.prepare(`
      SELECT category, COUNT(*) as count FROM posts
      WHERE scrape_status = 'complete' AND category IS NOT NULL
      GROUP BY category ORDER BY count DESC
    `).all() as { category: string; count: number }[];
    const categoryDistribution = catRows.map(r => ({ category: r.category, count: r.count }));

    // Timeline (monthly)
    const timeRows = db.prepare(`
      SELECT strftime('%Y-%m', date_posted) as month, COUNT(*) as count
      FROM posts WHERE scrape_status = 'complete' AND date_posted IS NOT NULL
      GROUP BY month ORDER BY month
    `).all() as { month: string; count: number }[];
    const timeline = timeRows.map(r => ({ month: r.month, count: r.count }));

    return { topHashtags, topAuthors, postTypeBreakdown, moodDistribution, categoryDistribution, timeline };
  } finally {
    db.close();
  }
}

// ══════════════════════════════════════════════════════════════
// Search index generation (built at build time, used client-side)
// ══════════════════════════════════════════════════════════════

export function buildSearchIndex(): SearchablePost[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT p.id, p.caption, p.hashtags, p.author_handle, p.transcript,
             p.keywords, p.ai_summary, p.media_type, p.thumbnail_url, p.media_urls,
             p.mood, p.category,
             GROUP_CONCAT(c.name, ', ') as collection_names
      FROM posts p
      LEFT JOIN post_collections pc ON p.id = pc.post_id
      LEFT JOIN collections c ON pc.collection_id = c.id
      WHERE p.scrape_status = 'complete'
      GROUP BY p.id
    `).all() as Record<string, unknown>[];

    return rows.map(r => ({
      id: r.id as number,
      caption: (r.caption as string) || '',
      hashtags: parseJsonArray(r.hashtags as string).join(' '),
      author: (r.author_handle as string) || '',
      transcript: (r.transcript as string) || '',
      keywords: parseJsonArray(r.keywords as string).join(' '),
      summary: (r.ai_summary as string) || '',
      collection_name: (r.collection_names as string) || '',
      media_type: (r.media_type as string) || '',
      thumbnail: parseJsonArray(r.media_urls as string)[0] || (r.thumbnail_url as string) || '',
      mood: (r.mood as string) || '',
      category: (r.category as string) || '',
    }));
  } finally {
    db.close();
  }
}

// ══════════════════════════════════════════════════════════════
// Demo data (used when no DB exists yet — first build)
// ══════════════════════════════════════════════════════════════

function getDemoCollections(): Collection[] {
  return [
    {
      id: 1, instagram_id: 'demo_1', name: 'Travel Inspiration', slug: 'travel-inspiration',
      cover_image_path: '/media/demo/travel.png', post_count: 12, summary: 'A curated collection of stunning travel destinations, from serene beaches to vibrant cityscapes. Each post captures the essence of wanderlust and adventure.',
      top_tags: ['travel', 'adventure', 'wanderlust', 'explore', 'nature'], created_at: '2024-01-01', updated_at: '2024-06-01',
    },
    {
      id: 2, instagram_id: 'demo_2', name: 'Design & Architecture', slug: 'design-architecture',
      cover_image_path: '/media/demo/design.png', post_count: 8, summary: 'Minimalist designs, bold architecture, and creative spaces that inspire. From Bauhaus to contemporary masterpieces.',
      top_tags: ['design', 'architecture', 'minimal', 'interior', 'modern'], created_at: '2024-01-01', updated_at: '2024-06-01',
    },
    {
      id: 3, instagram_id: 'demo_3', name: 'Food & Recipes', slug: 'food-recipes',
      cover_image_path: '/media/demo/food.png', post_count: 15, summary: 'Delicious meals, creative plating, and recipes worth saving. A food lover\'s visual diary.',
      top_tags: ['food', 'recipe', 'cooking', 'foodie', 'homemade'], created_at: '2024-01-01', updated_at: '2024-06-01',
    },
    {
      id: 4, instagram_id: 'demo_4', name: 'Tech & Innovation', slug: 'tech-innovation',
      cover_image_path: '/media/demo/tech.png', post_count: 6, summary: 'Cutting-edge technology, startups, and innovation that shapes our future.',
      top_tags: ['tech', 'ai', 'startup', 'innovation', 'code'], created_at: '2024-01-01', updated_at: '2024-06-01',
    },
  ];
}

function getDemoPosts(): Post[] {
  return [
    {
      id: 1, instagram_post_id: 'demo_post_1', media_type: 'image',
      caption: 'Golden hour at Santorini 🌅 The most magical sunset I\'ve ever witnessed. #travel #santorini #greece #sunset',
      hashtags: ['travel', 'santorini', 'greece', 'sunset'], author_handle: 'travelphotographer', author_name: 'Travel Photographer',
      permalink: 'https://instagram.com/p/demo1', date_posted: '2024-03-15', date_saved: null,
      like_count: 12540, comment_count: 342, location: 'Santorini, Greece', alt_text: 'Sunset over Santorini',
      media_urls: ['/media/demo/travel.png'], thumbnail_url: '/media/demo/travel.png', video_url: null, transcript: null, transcript_source: null,
      category: 'Travel', keywords: ['sunset', 'santorini', 'golden hour', 'greece', 'ocean'],
      mood: 'dreamy', ai_summary: 'A breathtaking golden hour sunset over the iconic Santorini skyline.',
      is_duplicate: false, duplicate_in: [], scrape_status: 'complete', enrichment_status: 'complete', error_message: null,
      created_at: '2024-03-15', updated_at: '2024-03-15',
    },
    {
      id: 2, instagram_post_id: 'demo_post_2', media_type: 'video',
      caption: 'Behind the scenes of our new product launch 🚀 #tech #startup #behindthescenes',
      hashtags: ['tech', 'startup', 'behindthescenes'], author_handle: 'techstartup', author_name: 'Tech Startup',
      permalink: 'https://instagram.com/p/demo2', date_posted: '2024-04-20', date_saved: null,
      like_count: 5230, comment_count: 128, location: 'San Francisco, CA', alt_text: null,
      media_urls: [], thumbnail_url: '/media/demo/tech.png', video_url: 'https://instagram.com/p/demo2/video',
      transcript: 'Today we are launching something incredible. After months of work, our team has built a platform that will change how people interact with technology. We believe in making tech accessible to everyone.',
      transcript_source: 'whisper',
      category: 'Tech', keywords: ['product launch', 'startup', 'technology', 'innovation', 'team'],
      mood: 'energetic', ai_summary: 'A startup reveals their new product launch with an inspiring behind-the-scenes look.',
      is_duplicate: false, duplicate_in: [], scrape_status: 'complete', enrichment_status: 'complete', error_message: null,
      created_at: '2024-04-20', updated_at: '2024-04-20',
    },
    {
      id: 3, instagram_post_id: 'demo_post_3', media_type: 'carousel',
      caption: 'Minimalist kitchen renovation complete ✨ Swipe for the before & after! #design #interior #minimal',
      hashtags: ['design', 'interior', 'minimal'], author_handle: 'designstudio', author_name: 'Design Studio',
      permalink: 'https://instagram.com/p/demo3', date_posted: '2024-05-10', date_saved: null,
      like_count: 8910, comment_count: 256, location: 'Copenhagen, Denmark', alt_text: 'Modern minimalist kitchen',
      media_urls: ['/media/demo/design.png'], thumbnail_url: '/media/demo/design.png', video_url: null, transcript: null, transcript_source: null,
      category: 'Design', keywords: ['kitchen', 'renovation', 'minimalist', 'interior design', 'modern'],
      mood: 'minimal', ai_summary: 'A stunning minimalist kitchen renovation showcasing before and after transformation.',
      is_duplicate: false, duplicate_in: [], scrape_status: 'complete', enrichment_status: 'complete', error_message: null,
      created_at: '2024-05-10', updated_at: '2024-05-10',
    },
    {
      id: 4, instagram_post_id: 'demo_post_4', media_type: 'image',
      caption: 'Sunday brunch goals 🥞🍓 Homemade pancakes with fresh berries and maple syrup. #food #brunch #homemade',
      hashtags: ['food', 'brunch', 'homemade'], author_handle: 'foodiecrafter', author_name: 'Foodie Crafter',
      permalink: 'https://instagram.com/p/demo4', date_posted: '2024-06-01', date_saved: null,
      like_count: 6780, comment_count: 189, location: 'New York, NY', alt_text: 'Pancakes with berries',
      media_urls: ['/media/demo/food.png'], thumbnail_url: '/media/demo/food.png', video_url: null, transcript: null, transcript_source: null,
      category: 'Food', keywords: ['pancakes', 'brunch', 'berries', 'homemade', 'breakfast'],
      mood: 'cozy', ai_summary: 'A delightful Sunday brunch spread featuring homemade pancakes topped with fresh berries.',
      is_duplicate: false, duplicate_in: [], scrape_status: 'complete', enrichment_status: 'complete', error_message: null,
      created_at: '2024-06-01', updated_at: '2024-06-01',
    },
  ];
}

function getDemoStats(): DBStats {
  return {
    collections: 4, total_posts: 41, images: 22, carousels: 8,
    videos: 11, transcripts: 9, enriched: 38, failed: 0, duplicates: 3,
  };
}

function getDemoInsights(): InsightData {
  return {
    topHashtags: [
      { tag: 'travel', count: 15 }, { tag: 'design', count: 12 }, { tag: 'food', count: 10 },
      { tag: 'photography', count: 8 }, { tag: 'minimal', count: 7 }, { tag: 'architecture', count: 6 },
      { tag: 'nature', count: 6 }, { tag: 'tech', count: 5 }, { tag: 'art', count: 5 },
      { tag: 'sunset', count: 4 },
    ],
    topAuthors: [
      { handle: 'travelphotographer', count: 8 }, { handle: 'designstudio', count: 6 },
      { handle: 'foodiecrafter', count: 5 }, { handle: 'techstartup', count: 4 },
      { handle: 'architecturelovers', count: 3 },
    ],
    postTypeBreakdown: [
      { type: 'image', count: 22 }, { type: 'carousel', count: 8 },
      { type: 'video', count: 7 }, { type: 'reel', count: 4 },
    ],
    moodDistribution: [
      { mood: 'minimal', count: 10 }, { mood: 'vibrant', count: 8 }, { mood: 'cozy', count: 7 },
      { mood: 'dreamy', count: 6 }, { mood: 'bold', count: 5 }, { mood: 'editorial', count: 5 },
    ],
    categoryDistribution: [
      { category: 'Travel', count: 12 }, { category: 'Design', count: 8 },
      { category: 'Food', count: 8 }, { category: 'Tech', count: 6 },
      { category: 'Art', count: 4 }, { category: 'Nature', count: 3 },
    ],
    timeline: [
      { month: '2024-01', count: 5 }, { month: '2024-02', count: 8 },
      { month: '2024-03', count: 12 }, { month: '2024-04', count: 7 },
      { month: '2024-05', count: 9 },
    ],
  };
}

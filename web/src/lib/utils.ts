/**
 * Utility helpers — slugify, date formatting, JSON parsing, etc.
 */

/**
 * Safely parse a JSON string into an array, returning empty array on failure.
 */
export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Format a date string into a human-readable format.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a number with commas (e.g. 1234 → "1,234").
 */
export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US');
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string | null | undefined, maxLen: number = 120): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

/**
 * Get a mood emoji for display.
 */
export function moodEmoji(mood: string | null | undefined): string {
  const map: Record<string, string> = {
    minimal: '◻️',
    cozy: '☕',
    vibrant: '🎨',
    editorial: '📰',
    bold: '⚡',
    moody: '🌙',
    playful: '🎪',
    elegant: '✨',
    raw: '🔥',
    dreamy: '☁️',
    nostalgic: '📷',
    energetic: '💫',
  };
  return map[mood || ''] || '•';
}

/**
 * Get a media type icon name (Lucide icon name).
 */
export function mediaTypeIcon(type: string): string {
  const map: Record<string, string> = {
    image: 'Image',
    carousel: 'Images',
    video: 'Video',
    reel: 'Film',
  };
  return map[type] || 'File';
}

/**
 * Get the display image path for a post (first image or thumbnail).
 */
export function getPostImagePath(post: {
  media_urls: string[];
  thumbnail_url: string | null;
  media_type: string;
}): string | null {
  if (post.media_type === 'image' || post.media_type === 'carousel') {
    return post.media_urls?.[0] || null;
  }
  return post.thumbnail_url || null;
}

/**
 * Generate a gradient CSS string from a mood.
 */
export function moodGradient(mood: string | null | undefined): string {
  const gradients: Record<string, string> = {
    minimal: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    cozy: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    vibrant: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    editorial: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    bold: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    moody: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    playful: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    elegant: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    raw: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
    dreamy: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    nostalgic: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
    energetic: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  };
  return gradients[mood || ''] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
}

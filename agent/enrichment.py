"""
AI enrichment pipeline — runs after scraping to add semantic understanding.
Uses Ollama (local LLM) for classification, keyword extraction, mood tagging, summaries.
"""

import json
from typing import Optional

import requests

from config import OLLAMA_HOST, OLLAMA_MODEL
from logger import get_logger
from database import (
    get_unenriched_posts,
    update_enrichment,
    detect_duplicates,
    rebuild_fts,
    get_all_collections,
    get_posts_by_collection,
    update_collection_summary,
)

log = get_logger("enrichment")

# ── Categories and moods ────────────────────────────────────
CATEGORIES = [
    "Travel", "Food", "Design", "Tech", "Art", "Fashion", "Fitness",
    "Nature", "Music", "Photography", "Architecture", "Motivation",
    "Lifestyle", "Beauty", "Science", "Books", "DIY", "Humor", "Other",
]

MOODS = [
    "minimal", "cozy", "vibrant", "editorial", "bold", "moody",
    "playful", "elegant", "raw", "dreamy", "nostalgic", "energetic",
]


def ollama_generate(prompt: str, temperature: float = 0.3) -> Optional[str]:
    """Send a prompt to Ollama and return the response text."""
    try:
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": temperature},
            },
            timeout=60,
        )
        response.raise_for_status()
        return response.json().get("response", "").strip()
    except requests.ConnectionError:
        log.warning("Ollama not available at %s", OLLAMA_HOST)
        return None
    except Exception as e:
        log.warning("Ollama request failed: %s", str(e))
        return None


def classify_post(text: str) -> Optional[str]:
    """Classify a post into one of the predefined categories."""
    prompt = f"""Classify the following social media post into exactly ONE of these categories:
{', '.join(CATEGORIES)}

Post content:
\"\"\"{text[:500]}\"\"\"

Return ONLY the category name, nothing else."""

    result = ollama_generate(prompt)
    if result and result in CATEGORIES:
        return result
    # Try to find a match even if the model added extra text
    if result:
        for cat in CATEGORIES:
            if cat.lower() in result.lower():
                return cat
    return "Other"


def extract_keywords(text: str) -> list[str]:
    """Extract top 5 keywords from post text."""
    prompt = f"""Extract the 5 most important keywords from this social media post.
Return them as a comma-separated list, nothing else.

Post content:
\"\"\"{text[:500]}\"\"\"

Keywords:"""

    result = ollama_generate(prompt)
    if result:
        keywords = [k.strip().lower() for k in result.split(",") if k.strip()]
        return keywords[:5]
    return []


def tag_mood(text: str) -> Optional[str]:
    """Assign an aesthetic mood tag to a post."""
    prompt = f"""Assign an aesthetic mood to this social media post.
Choose exactly ONE from: {', '.join(MOODS)}

Post content:
\"\"\"{text[:500]}\"\"\"

Mood:"""

    result = ollama_generate(prompt)
    if result:
        for mood in MOODS:
            if mood.lower() in result.lower():
                return mood
    return "minimal"  # Default fallback


def summarize_post(text: str) -> Optional[str]:
    """Generate a one-line AI summary of a post."""
    prompt = f"""Write a single concise sentence summarizing this social media post.
Maximum 15 words. No quotes, no preamble.

Post content:
\"\"\"{text[:500]}\"\"\"

Summary:"""

    result = ollama_generate(prompt, temperature=0.5)
    if result:
        # Clean up common LLM artifacts
        result = result.strip('"').strip("'").strip()
        if len(result) > 200:
            result = result[:200] + "..."
    return result


def summarize_collection(collection_name: str, posts: list[dict]) -> Optional[str]:
    """Generate a one-paragraph summary of a collection."""
    # Build a condensed view of the collection
    post_snippets = []
    for p in posts[:20]:  # Limit to 20 to stay within context
        snippet = (p.get("caption") or p.get("transcript") or p.get("ai_summary") or "")[:100]
        if snippet:
            post_snippets.append(snippet)

    content = "\n".join(post_snippets)

    prompt = f"""Write a one-paragraph summary (3-4 sentences) describing this Instagram saved collection.
The collection is called "{collection_name}" and contains {len(posts)} posts.

Here are excerpts from the posts:
\"\"\"{content}\"\"\"

Summary:"""

    return ollama_generate(prompt, temperature=0.6)


def enrich_all_posts() -> dict:
    """
    Run enrichment on all unenriched posts.
    Returns stats dict.
    """
    stats = {"enriched": 0, "failed": 0, "skipped": 0}

    posts = get_unenriched_posts()
    if not posts:
        log.info("No posts to enrich — all up to date")
        return stats

    log.info("Enriching %d posts...", len(posts))

    # Check Ollama availability
    test = ollama_generate("Say 'ok'")
    if test is None:
        log.error("Ollama is not available. Start it with: ollama serve")
        log.error("Then pull the model: ollama pull %s", OLLAMA_MODEL)
        return stats

    for idx, post in enumerate(posts, 1):
        post_id = post["id"]
        ig_id = post["instagram_post_id"]

        # Build the text content for analysis
        text_parts = []
        if post.get("caption"):
            text_parts.append(post["caption"])
        if post.get("transcript"):
            text_parts.append(post["transcript"])
        if post.get("hashtags"):
            try:
                tags = json.loads(post["hashtags"])
                text_parts.append(" ".join(f"#{t}" for t in tags))
            except (json.JSONDecodeError, TypeError):
                text_parts.append(post["hashtags"])

        text = " ".join(text_parts).strip()

        if not text or len(text) < 10:
            log.debug("  Skipping %d/%d (%s): insufficient text", idx, len(posts), ig_id)
            stats["skipped"] += 1
            continue

        log.info("  Enriching %d/%d: %s", idx, len(posts), ig_id)

        try:
            category = classify_post(text)
            keywords = extract_keywords(text)
            mood = tag_mood(text)
            ai_summary = summarize_post(text)

            update_enrichment(post_id, {
                "category": category,
                "keywords": keywords,
                "mood": mood,
                "ai_summary": ai_summary,
            })
            stats["enriched"] += 1

        except Exception as e:
            log.error("  Enrichment failed for %s: %s", ig_id, str(e))
            stats["failed"] += 1

    # ── Post-enrichment tasks ───────────────────────────────
    log.info("Running post-enrichment tasks...")

    # Detect duplicates
    detect_duplicates()

    # Generate collection summaries
    _enrich_collections()

    # Rebuild FTS index
    rebuild_fts()

    log.info("=" * 40)
    log.info("  Enrichment Complete!")
    log.info("  Enriched:  %d posts", stats["enriched"])
    log.info("  Failed:    %d posts", stats["failed"])
    log.info("  Skipped:   %d posts (no text)", stats["skipped"])
    log.info("=" * 40)

    return stats


def _enrich_collections() -> None:
    """Generate summaries and top tags for all collections."""
    collections = get_all_collections()

    for coll in collections:
        posts = get_posts_by_collection(coll["id"])
        if not posts:
            continue

        # Generate summary
        summary = summarize_collection(coll["name"], posts)

        # Aggregate top tags from post keywords
        tag_counts: dict[str, int] = {}
        for p in posts:
            if p.get("keywords"):
                try:
                    kws = json.loads(p["keywords"])
                    for kw in kws:
                        tag_counts[kw] = tag_counts.get(kw, 0) + 1
                except (json.JSONDecodeError, TypeError):
                    pass

        top_tags = sorted(tag_counts, key=tag_counts.get, reverse=True)[:10]

        update_collection_summary(coll["id"], summary, top_tags)
        log.info("  Updated collection: %s (%d top tags)", coll["name"], len(top_tags))

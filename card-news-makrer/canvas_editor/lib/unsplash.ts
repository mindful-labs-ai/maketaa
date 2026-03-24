/**
 * Unsplash API Utility
 * Direct fetch-based client — no external package required
 * API key: NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
 */

const UNSPLASH_BASE = 'https://api.unsplash.com';

// ============================================================================
// Types
// ============================================================================

export interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string; full: string };
  alt_description: string | null;
  user: { name: string; links: { html: string } };
}

// ============================================================================
// Simple in-memory cache
// ============================================================================

const cache = new Map<string, UnsplashPhoto[]>();

function cacheKey(query: string, page: number, perPage: number): string {
  return `${query}|${page}|${perPage}`;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search photos on Unsplash.
 * Returns [] when API key is missing — callers should handle that gracefully.
 */
export async function searchPhotos(
  query: string,
  page = 1,
  perPage = 9
): Promise<UnsplashPhoto[]> {
  const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return [];
  }

  const key = cacheKey(query, page, perPage);
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const url = new URL(`${UNSPLASH_BASE}/search/photos`);
  url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('orientation', 'portrait');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1',
    },
  });

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const photos: UnsplashPhoto[] = data.results ?? [];

  cache.set(key, photos);
  return photos;
}

/**
 * Check whether an Unsplash API key is configured.
 */
export function hasUnsplashKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY);
}

// ============================================================================
// Card-role → default search query suggestions
// ============================================================================

const ROLE_QUERY_MAP: Record<string, string> = {
  cover: 'abstract background',
  empathy: 'people emotion',
  statistics: 'data analytics minimal',
  tip: 'nature calm',
  quote: 'light texture',
  closing: 'hope sky',
};

export function suggestQuery(role?: string | null): string {
  if (!role) return 'abstract background';
  return ROLE_QUERY_MAP[role] ?? 'abstract background';
}

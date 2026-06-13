/**
 * Server-side URL preview fetcher. Blueprint §7.1.
 *
 * Returns {title, description, image, source}. Defensive:
 *  - http(s) only; private hostnames blocked
 *  - 5s per-request timeout (TikTok is slow; longer than blueprint's 4s)
 *  - response capped at 1MB
 *  - non-text content-types short-circuited
 *
 * Strategy by host:
 *  - TikTok (tiktok.com / vm.tiktok.com / vt.tiktok.com): use the public oEmbed
 *    endpoint. The user-facing HTML is React-rendered and og:* tags are
 *    inconsistent; oEmbed returns clean title/thumbnail/author every time
 *    and doesn't require auth. https://developers.tiktok.com/doc/embed-videos
 *  - Instagram: try oEmbed (works without auth for permalinks pre-2025
 *    deprecation; falls back gracefully). Then og:* scrape.
 *  - Everything else: og:* scrape with a real browser User-Agent.
 *
 * Never throws — callers fall back to manual entry.
 */
export type Preview = {
  title: string | null;
  description: string | null;
  image: string | null;
  source: string | null;
};

const NULL: Preview = { title: null, description: null, image: null, source: null };

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 1_000_000;

// Real Chrome UA. The previous custom "HeoMasuriBot/1.0" was rejected by TikTok
// and most modern sites that gate scrapers. With this UA we get the same SSR
// payload a browser would.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isPrivateHostname(hostname: string): boolean {
  if (!hostname) return true;
  const h = hostname.toLowerCase();
  if (h === "localhost") return true;
  if (h === "0.0.0.0") return true;
  if (h.endsWith(".local")) return true;
  if (h.endsWith(".internal")) return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  return false;
}

function isTikTok(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "tiktok.com" ||
    h.endsWith(".tiktok.com") // www.tiktok.com, vm.tiktok.com, vt.tiktok.com
  );
}

function isTikTokShortLink(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "vt.tiktok.com" || h === "vm.tiktok.com" || h === "vs.tiktok.com";
}

/**
 * Resolve a short link (vt.tiktok.com/XXX) to its canonical
 * (www.tiktok.com/@user/video/123) form. TikTok's oEmbed endpoint only accepts
 * canonical URLs — passing a short link returns 404 with no body.
 *
 * Strategy: GET with redirect=follow, abort the body read once headers land,
 * read `res.url` for the post-redirect URL. Strip query strings (TikTok adds a
 * tracking `?_t=...&_r=...` that oEmbed will reject too).
 */
async function resolveTikTokShortLink(url: URL): Promise<URL> {
  const res = await fetchWithTimeout(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html",
    },
    redirect: "follow",
  });
  // Abort the body — we only wanted the final URL.
  res?.body?.cancel().catch(() => undefined);
  if (!res || !res.url) return url;
  try {
    const resolved = new URL(res.url);
    // Strip TikTok's tracking query string; the path alone identifies the video.
    resolved.search = "";
    return resolved;
  } catch {
    return url;
  }
}

function isInstagram(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "instagram.com" || h.endsWith(".instagram.com");
}

function extractMeta(html: string, key: string): string | null {
  // Match <meta property="og:title" content="..."> with either order, both quote styles.
  const re = new RegExp(
    `<meta[^>]*?(?:property|name)=["']${key}["'][^>]*?content=["']([^"']+)["']`,
    "i"
  );
  const m = re.exec(html);
  if (m && m[1]) return decodeHtml(m[1]).trim() || null;
  const re2 = new RegExp(
    `<meta[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["']${key}["']`,
    "i"
  );
  const m2 = re2.exec(html);
  if (m2 && m2[1]) return decodeHtml(m2[1]).trim() || null;
  return null;
}

function extractTitleTag(html: string): string | null {
  const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  return m && m[1] ? decodeHtml(m[1]).trim() || null : null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function readBodyCapped(res: Response): Promise<string | null> {
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      chunks.push(value);
    }
  }
  reader.cancel().catch(() => undefined);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return chunks.map((c) => decoder.decode(c, { stream: true })).join("");
}

/**
 * TikTok oEmbed — returns title + thumbnail without scraping. Works for both
 * www.tiktok.com/@user/video/123 and short links (vm.tiktok.com/...). The
 * short-link form gets resolved server-side by TikTok inside the oembed call.
 */
async function fetchTikTokPreview(url: URL): Promise<Preview> {
  // Expand short links (vt./vm./vs.tiktok.com) before hitting oEmbed.
  const canonical = isTikTokShortLink(url.hostname)
    ? await resolveTikTokShortLink(url)
    : url;

  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonical.toString())}`;
  const res = await fetchWithTimeout(oembedUrl, {
    method: "GET",
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "application/json",
    },
    redirect: "follow",
  });
  if (res && res.ok) {
    type TikTokOembed = {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    try {
      const data = (await res.json()) as TikTokOembed;
      // TikTok puts the caption in `title`. Compose "@author · caption" so
      // the polaroid label reads well instead of just "TikTok".
      const title =
        data.title && data.author_name
          ? `${data.author_name} · ${data.title}`
          : data.title ?? data.author_name ?? null;
      if (title || data.thumbnail_url) {
        return {
          title,
          description: data.author_name ?? null,
          image: data.thumbnail_url ?? null,
          source: "tiktok.com",
        };
      }
    } catch { /* fall through to scrape */ }
  }

  // oEmbed failed — usually a region block on the staging server. Try TikTok's
  // own page: fetch with a mobile UA (gets a different SSR payload than
  // desktop), then extract from the injected __UNIVERSAL_DATA_FOR_REHYDRATION__
  // JSON. That has the real video metadata. og:* tags are unreliable here —
  // TikTok sometimes serves the homepage to scrapers, with just "TikTok - Make
  // Your Day" as og:title and no image.
  const fromState = await fetchTikTokViaPageState(canonical);
  if (fromState) return fromState;

  // Last-ditch og:* scrape. If even this returns the homepage title we'll
  // detect it and null out so the form falls back to manual entry.
  const scraped = await fetchGenericPreview(canonical);
  if (
    scraped.title &&
    /^TikTok\b/i.test(scraped.title.trim()) &&
    !scraped.image
  ) {
    return { ...NULL, source: "tiktok.com" };
  }
  return { ...scraped, source: "tiktok.com" };
}

/**
 * Extract video metadata from TikTok's page state JSON. TikTok injects a
 * <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
 * with the full video object when the page loads — same data the React app
 * hydrates from. Reading this directly avoids the og:* tag inconsistency.
 *
 * Mobile UA + Accept-Language give us a more og:-friendly response too.
 */
async function fetchTikTokViaPageState(url: URL): Promise<Preview | null> {
  const MOBILE_UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
    "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

  const res = await fetchWithTimeout(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": MOBILE_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res || !res.ok) return null;
  const html = await readBodyCapped(res);
  if (!html) return null;

  // The script tag is always: id="__UNIVERSAL_DATA_FOR_REHYDRATION__".
  const stateMatch = /<script[^>]+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i.exec(
    html
  );
  if (stateMatch && stateMatch[1]) {
    try {
      const data = JSON.parse(stateMatch[1]);
      const item =
        data?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct ??
        null;
      if (item) {
        const author = item.author?.uniqueId || item.author?.nickname || null;
        const caption = typeof item.desc === "string" ? item.desc.trim() : null;
        const cover =
          item.video?.cover ||
          item.video?.originCover ||
          item.video?.dynamicCover ||
          null;
        const title =
          caption && author
            ? `@${author} · ${caption}`
            : caption || (author ? `@${author}` : null);
        if (title || cover) {
          return {
            title,
            description: author ? `@${author}` : null,
            image: cover,
            source: "tiktok.com",
          };
        }
      }
    } catch { /* fall through */ }
  }

  // Older pages use SIGI_STATE — same idea, different shape.
  const sigiMatch = /<script[^>]+id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (sigiMatch && sigiMatch[1]) {
    try {
      const data = JSON.parse(sigiMatch[1]);
      const itemMap = data?.ItemModule;
      if (itemMap && typeof itemMap === "object") {
        const firstId = Object.keys(itemMap)[0];
        const item = firstId ? itemMap[firstId] : null;
        if (item) {
          const author = item.author || null;
          const caption = typeof item.desc === "string" ? item.desc.trim() : null;
          const cover = item.video?.cover || item.video?.originCover || null;
          const title =
            caption && author
              ? `@${author} · ${caption}`
              : caption || (author ? `@${author}` : null);
          if (title || cover) {
            return {
              title,
              description: author ? `@${author}` : null,
              image: cover,
              source: "tiktok.com",
            };
          }
        }
      }
    } catch { /* ignore */ }
  }

  return null;
}

/**
 * Instagram oEmbed (legacy public endpoint). Falls back to og:* scrape if
 * oembed denies us — IG started gating oembed behind an app token in 2021,
 * but public reels/posts often still return data when fetched from a server
 * with a real UA.
 */
async function fetchInstagramPreview(url: URL): Promise<Preview> {
  // Try oembed first (works for some public posts).
  const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url.toString())}`;
  const oembedRes = await fetchWithTimeout(oembedUrl, {
    method: "GET",
    headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
    redirect: "follow",
  });
  if (oembedRes && oembedRes.ok) {
    type IgOembed = {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    try {
      const data = (await oembedRes.json()) as IgOembed;
      const title =
        data.title && data.author_name
          ? `${data.author_name} · ${data.title}`
          : data.title ?? data.author_name ?? null;
      if (data.thumbnail_url || title) {
        return {
          title,
          description: data.author_name ?? null,
          image: data.thumbnail_url ?? null,
          source: "instagram.com",
        };
      }
    } catch { /* fall through */ }
  }
  // Fall back to og:* scrape with a real UA — works for posts that ship
  // SSR'd meta tags (most reels do).
  return fetchGenericPreview(url);
}

async function fetchGenericPreview(url: URL): Promise<Preview> {
  const res = await fetchWithTimeout(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    },
    redirect: "follow",
  });
  if (!res || !res.ok) return { ...NULL, source: url.hostname };

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.startsWith("text/") && !ct.includes("html")) return { ...NULL, source: url.hostname };

  const html = await readBodyCapped(res);
  if (!html) return { ...NULL, source: url.hostname };

  const ogTitle = extractMeta(html, "og:title");
  const ogDesc = extractMeta(html, "og:description") ?? extractMeta(html, "description");
  const ogImage =
    extractMeta(html, "og:image") ??
    extractMeta(html, "og:image:secure_url") ??
    extractMeta(html, "twitter:image");
  const titleTag = extractTitleTag(html);

  return {
    title: ogTitle ?? titleTag,
    description: ogDesc,
    image: ogImage,
    source: url.hostname,
  };
}

export async function fetchUrlPreview(input: string): Promise<Preview> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return NULL;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return NULL;
  if (isPrivateHostname(url.hostname)) return NULL;

  if (isTikTok(url.hostname)) return fetchTikTokPreview(url);
  if (isInstagram(url.hostname)) return fetchInstagramPreview(url);
  return fetchGenericPreview(url);
}

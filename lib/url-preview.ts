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
  /**
   * Canonical URL after redirect resolution. Returned even on null previews so
   * the client can retry the oEmbed call from the browser (where TikTok's
   * residential-IP gate is much friendlier). Always present for TikTok URLs.
   */
  canonical_url?: string | null;
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
 * STABILITY (the vt. flakiness fix): the previous single redirect=follow GET
 * downloaded the body and, on any timeout, returned the UNRESOLVED short link.
 * Downstream oEmbed/noembed/client-retry all need the canonical URL, so a
 * resolution miss meant the whole fetch silently failed for that vt. link —
 * "sometimes works, sometimes doesn't".
 *
 * New strategy, in order:
 *   1. Manual-redirect hop loop reading the `Location` header only (no body
 *      download → fast + reliable; undici exposes 3xx + Location on the server
 *      with redirect:"manual"). Up to 5 hops.
 *   2. Fallback: redirect:"follow" + res.url (the old behaviour).
 *   3. One retry of the whole thing if the first attempt yields no canonical.
 * Always strips the tracking query string.
 */
async function resolveTikTokShortLink(url: URL): Promise<URL> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const resolved = await resolveOnce(url);
    if (resolved && !isTikTokShortLink(resolved.hostname)) {
      resolved.search = "";
      return resolved;
    }
  }
  // Couldn't expand — return the original (callers will try page-state, which
  // follows redirects itself and recovers the canonical from res.url).
  url.search = "";
  return url;
}

async function resolveOnce(url: URL): Promise<URL | null> {
  // 1) Manual-redirect hop loop — read Location, don't download bodies.
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetchWithTimeout(current.toString(), {
      method: "GET",
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
      redirect: "manual",
    });
    if (!res) break;
    const loc = res.headers.get("location");
    res.body?.cancel().catch(() => undefined);
    if (loc && res.status >= 300 && res.status < 400) {
      try {
        current = new URL(loc, current);
      } catch {
        break;
      }
      if (!isTikTokShortLink(current.hostname)) return current;
      continue; // another short hop (vt → vt is rare but possible)
    }
    // Non-3xx on a short-link host → manual mode can't help; break to fallback.
    break;
  }

  // 2) Fallback: follow + res.url.
  const res = await fetchWithTimeout(url.toString(), {
    method: "GET",
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
    redirect: "follow",
  });
  res?.body?.cancel().catch(() => undefined);
  if (res?.url) {
    try {
      return new URL(res.url);
    } catch {
      /* ignore */
    }
  }
  return null;
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

/**
 * Normalize a TikTok author handle. TikTok's degraded oEmbed now returns "@"
 * (a bare at-sign) or an empty string as author_name — this is the source of
 * idea cards whose title is just "@". Strip a leading @ and return null for
 * anything empty. Callers must treat a null author as "no author" and never
 * synthesize a title of just "@".
 */
function cleanTikTokAuthor(name: string | null | undefined): string | null {
  if (!name) return null;
  const s = name.trim().replace(/^@+/, "").trim();
  return s.length > 0 ? s : null;
}

/**
 * Reject placeholder / spinner images so we never store a loading GIF as a
 * thumbnail. microlink returns TikTok's `tiktok-loading.<hash>.gif` (served
 * from the webapp static host) when it can't resolve the real cover, and og:*
 * scrapes sometimes hand back the same asset-host stubs.
 */
function isPlaceholderImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return (
    u.includes("tiktok-loading") ||
    u.includes("/webapp/") ||
    u.includes("tiktok-web-tx") ||
    u.includes("placeholder")
  );
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
  // Expand short links (vt./vm./vs.tiktok.com) to the canonical /video/ or
  // /photo/ path.
  let canonical = isTikTokShortLink(url.hostname)
    ? await resolveTikTokShortLink(url)
    : url;
  canonical.search = "";
  let canonicalStr = canonical.toString();
  let isPhotoPath = /\/photo\//i.test(canonical.pathname);
  // Did short-link expansion succeed? If not, the page-state fetch (which
  // follows redirects) is our recovery path for the canonical URL.
  const stillShort = isTikTokShortLink(canonical.hostname);

  // PRIMARY tier: tikwm.com. It's reliable from datacenter IPs and resolves
  // short links itself, so try the ORIGINAL url first (sidesteps the flaky
  // redirect resolution that produced blank cards), then the canonical if that
  // missed. Covers both /video/ and /photo/. Returns a real cover + caption,
  // unlike TikTok's degraded oEmbed ("@" stub) and microlink (spinner GIF).
  const tikwm =
    (await tryTikwm(url.toString())) ??
    (canonicalStr !== url.toString() ? await tryTikwm(canonicalStr) : null);
  if (tikwm) return { ...tikwm, canonical_url: canonicalStr };

  // Photo posts (with a real canonical): try microlink first. The mobile-UA
  // scrape works locally but fails from Vercel's datacenter IP (TikTok
  // rate-limits photo paths aggressively); microlink.io has its own infra.
  if (isPhotoPath && !stillShort) {
    const ml = await tryMicrolink(canonicalStr);
    if (ml) return { ...ml, canonical_url: canonicalStr };
  }

  // Tier — mobile-UA scrape → <script id="api-data"> JSON. Works for /video/
  // and /photo/ when not IP-blocked, AND recovers the post-redirect canonical
  // URL (res.url) even when resolveTikTokShortLink couldn't expand the vt link.
  const state = await fetchTikTokViaPageState(canonical);
  if (state.resolvedUrl) {
    try {
      const r = new URL(state.resolvedUrl);
      r.search = "";
      if (!isTikTokShortLink(r.hostname)) {
        canonical = r;
        canonicalStr = r.toString();
        isPhotoPath = /\/photo\//i.test(r.pathname);
      }
    } catch {
      /* keep prior canonical */
    }
  }
  if (state.preview) return { ...state.preview, canonical_url: canonicalStr };

  // Remaining tiers, now with the best canonical we could resolve.
  if (isPhotoPath) {
    const ml = await tryMicrolink(canonicalStr);
    if (ml) return { ...ml, canonical_url: canonicalStr };
  } else {
    // oEmbed + noembed both 400 on /photo/ and on unexpanded short links.
    const oembed = await tryTikTokOembed(canonicalStr);
    if (oembed) return { ...oembed, canonical_url: canonicalStr };
    const noembed = await tryNoembed(canonicalStr);
    if (noembed) return { ...noembed, canonical_url: canonicalStr };
    const ml = await tryMicrolink(canonicalStr);
    if (ml) return { ...ml, canonical_url: canonicalStr };
  }

  // og:* scrape — usually the "TikTok - Make Your Day" stub.
  const scraped = await fetchGenericPreview(canonical);
  const isHomepageHit =
    scraped.title &&
    /^TikTok\b/i.test(scraped.title.trim()) &&
    !scraped.image;
  if (isHomepageHit) {
    return { ...NULL, source: "tiktok.com", canonical_url: canonicalStr };
  }
  return { ...scraped, source: "tiktok.com", canonical_url: canonicalStr };
}

/**
 * tikwm.com — free public TikTok metadata API and our PRIMARY tier.
 *
 * Why this exists: TikTok's own oEmbed now serves an anonymized stub
 * (author_name "@", empty title) and microlink returns a loading-spinner GIF
 * as the image — so the previous chain produced blank cards or a bare "@".
 * tikwm returns the real caption + a real cover thumbnail for BOTH /video/ and
 * /photo/ posts, works from datacenter IPs (Vercel), and accepts the raw
 * vt./vm. short link directly — no redirect resolution needed.
 * Verified 2026-06-26 against the exact links failing in prod.
 */
async function tryTikwm(anyTikTokUrl: string): Promise<Preview | null> {
  const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(anyTikTokUrl)}`;
  const res = await fetchWithTimeout(api, {
    method: "GET",
    headers: { Accept: "application/json" },
    redirect: "follow",
  });
  if (!res || !res.ok) return null;
  type TikwmRes = {
    code?: number;
    data?: {
      title?: string;
      cover?: string;
      origin_cover?: string;
      images?: string[];
      author?: { unique_id?: string; nickname?: string };
    };
  };
  try {
    const body = (await res.json()) as TikwmRes;
    if (body.code !== 0 || !body.data) return null;
    const d = body.data;
    const author =
      cleanTikTokAuthor(d.author?.unique_id) ?? cleanTikTokAuthor(d.author?.nickname);
    const caption = d.title?.trim() || null;
    const rawImage =
      d.cover?.trim() ||
      d.origin_cover?.trim() ||
      (Array.isArray(d.images) && d.images.length > 0 ? d.images[0] : null) ||
      null;
    const image = isPlaceholderImage(rawImage) ? null : rawImage;
    const title =
      caption && author
        ? `@${author} · ${caption}`
        : caption || (author ? `@${author}` : null);
    if (!title && !image) return null;
    return {
      title,
      description: author ? `@${author}` : null,
      image,
      source: "tiktok.com",
    };
  } catch {
    return null;
  }
}

/**
 * microlink.io — free public metadata extractor. Verified locally (~6s) to
 * return clean JSON for TikTok /photo/ URLs where our own scrape fails from
 * Vercel's IP. Returns { author, title, description, image: { url } }.
 *
 * Free tier rate limits are ~50/day per IP, plenty for our usage.
 */
async function tryMicrolink(canonicalUrl: string): Promise<Preview | null> {
  const u = `https://api.microlink.io/?url=${encodeURIComponent(canonicalUrl)}`;
  const res = await fetchWithTimeout(u, {
    method: "GET",
    headers: { Accept: "application/json" },
    redirect: "follow",
  });
  if (!res || !res.ok) return null;
  type MicrolinkRes = {
    status?: string;
    data?: {
      author?: string;
      title?: string;
      description?: string;
      image?: { url?: string } | string;
    };
  };
  try {
    const body = (await res.json()) as MicrolinkRes;
    if (body.status !== "success" || !body.data) return null;
    const d = body.data;
    const caption = d.description?.trim() || null;
    const author = d.author?.trim() || null;
    const rawImage =
      typeof d.image === "string" ? d.image : d.image?.url ?? null;
    const image = isPlaceholderImage(rawImage) ? null : rawImage;
    const title =
      caption && author
        ? `@${author.replace(/^@/, "")} · ${caption}`
        : caption || d.title || author || null;
    if (!title && !image) return null;
    return {
      title,
      description: author ? `@${author.replace(/^@/, "")}` : null,
      image,
      source: "tiktok.com",
    };
  } catch {
    return null;
  }
}

/** TikTok oEmbed — clean fast path when it works. */
async function tryTikTokOembed(canonicalUrl: string): Promise<Preview | null> {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`;
  const res = await fetchWithTimeout(oembedUrl, {
    method: "GET",
    headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
    redirect: "follow",
  });
  if (!res || !res.ok) return null;
  type TikTokOembed = {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
  };
  try {
    const data = (await res.json()) as TikTokOembed;
    // Sanitize: TikTok's degraded oEmbed returns author_name "@" and an empty
    // title. cleanTikTokAuthor drops the bare "@", and an empty caption becomes
    // null — so we never synthesize a title of just "@".
    const author = cleanTikTokAuthor(data.author_name);
    const caption = data.title?.trim() || null;
    const image = data.thumbnail_url?.trim() || null;
    const title =
      caption && author
        ? `@${author} · ${caption}`
        : caption || (author ? `@${author}` : null);
    if (title || image) {
      return {
        title,
        description: author ? `@${author}` : null,
        image,
        source: "tiktok.com",
      };
    }
  } catch { /* fall through */ }
  return null;
}

/**
 * noembed.com — public oEmbed proxy. Free, no auth, handles TikTok by
 * routing through its own infrastructure. Often clears TikTok's IP gate
 * when our direct oEmbed call doesn't.
 */
async function tryNoembed(canonicalUrl: string): Promise<Preview | null> {
  const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`;
  const res = await fetchWithTimeout(noembedUrl, {
    method: "GET",
    headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
    redirect: "follow",
  });
  if (!res || !res.ok) return null;
  type NoembedRes = {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
    error?: string;
  };
  try {
    const data = (await res.json()) as NoembedRes;
    if (data.error) return null;
    const author = cleanTikTokAuthor(data.author_name);
    const caption = data.title?.trim() || null;
    const image = data.thumbnail_url?.trim() || null;
    const title =
      caption && author
        ? `@${author} · ${caption}`
        : caption || (author ? `@${author}` : null);
    if (title || image) {
      return {
        title,
        description: author ? `@${author}` : null,
        image,
        source: "tiktok.com",
      };
    }
  } catch { /* fall through */ }
  return null;
}

/**
 * Extract video/photo metadata from TikTok's page state JSON.
 *
 * Verified locally (see .test-tiktok*.mjs): with a mobile iOS UA, TikTok
 * inlines a <script id="api-data"> tag containing
 *   { videoDetail: { itemInfo: { itemStruct: {...} } } }
 * for both /video/ and /photo/ URLs. The item has author.uniqueId, desc,
 * video.cover (yes — populated even for photo posts), and for photo
 * carousels also imagePost.cover.imageURL.urlList[0].
 *
 * The desktop UA path is gated to "TikTok - Make Your Day" with no data
 * scopes; only the mobile UA reliably serves the item JSON to us.
 *
 * Falls back to the legacy __UNIVERSAL_DATA_FOR_REHYDRATION__ scopes for
 * older page versions (none seen recently but cheap to keep).
 */
async function fetchTikTokViaPageState(
  url: URL
): Promise<{ preview: Preview | null; resolvedUrl: string | null }> {
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
  // Capture the post-redirect URL even on a failed/empty body — it lets the
  // caller recover the canonical URL for a vt. link the resolver couldn't expand.
  const resolvedUrl = res?.url || null;
  if (!res || !res.ok) return { preview: null, resolvedUrl };
  const html = await readBodyCapped(res);
  if (!html) return { preview: null, resolvedUrl };

  // Primary: <script id="api-data"> with videoDetail.itemInfo.itemStruct.
  const apiMatch = /<script[^>]+id=["']api-data["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (apiMatch && apiMatch[1]) {
    try {
      const data = JSON.parse(apiMatch[1]);
      const item = data?.videoDetail?.itemInfo?.itemStruct;
      const fromItem = extractFromItem(item);
      if (fromItem) return { preview: fromItem, resolvedUrl };
    } catch { /* fall through */ }
  }

  // Legacy A: __UNIVERSAL_DATA_FOR_REHYDRATION__ with __DEFAULT_SCOPE__ shapes.
  const universalMatch = /<script[^>]+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i.exec(
    html
  );
  if (universalMatch && universalMatch[1]) {
    try {
      const data = JSON.parse(universalMatch[1]);
      const scope = data?.__DEFAULT_SCOPE__ ?? {};
      const item =
        scope["webapp.video-detail"]?.itemInfo?.itemStruct ??
        scope["webapp.photo-detail"]?.itemInfo?.itemStruct ??
        scope["webapp.image-detail"]?.itemInfo?.itemStruct ??
        null;
      const fromItem = extractFromItem(item);
      if (fromItem) return { preview: fromItem, resolvedUrl };
    } catch { /* fall through */ }
  }

  // Legacy B: SIGI_STATE.ItemModule[firstId].
  const sigiMatch = /<script[^>]+id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (sigiMatch && sigiMatch[1]) {
    try {
      const data = JSON.parse(sigiMatch[1]);
      const itemMap = data?.ItemModule;
      if (itemMap && typeof itemMap === "object") {
        const firstId = Object.keys(itemMap)[0];
        const item = firstId ? itemMap[firstId] : null;
        // SIGI shape stores author as a bare string; normalize.
        if (item && typeof item.author === "string") {
          item.author = { uniqueId: item.author };
        }
        const fromItem = extractFromItem(item);
        if (fromItem) return { preview: fromItem, resolvedUrl };
      }
    } catch { /* ignore */ }
  }

  return { preview: null, resolvedUrl };
}

/** Common shape extractor — itemStruct has the same field names across all
 *  three page-state blocks. */
function extractFromItem(item: unknown): Preview | null {
  if (!item || typeof item !== "object") return null;
  const it = item as {
    author?: { uniqueId?: string; nickname?: string } | string;
    desc?: string;
    video?: { cover?: string; originCover?: string; dynamicCover?: string };
    imagePost?: {
      cover?: { imageURL?: { urlList?: string[] } };
      images?: { imageURL?: { urlList?: string[] } }[];
    };
  };
  const author =
    typeof it.author === "string"
      ? it.author
      : it.author?.uniqueId || it.author?.nickname || null;
  const caption = typeof it.desc === "string" ? it.desc.trim() : null;
  const cover =
    it.video?.cover ||
    it.video?.originCover ||
    it.video?.dynamicCover ||
    it.imagePost?.cover?.imageURL?.urlList?.[0] ||
    it.imagePost?.images?.[0]?.imageURL?.urlList?.[0] ||
    null;
  const title =
    caption && author
      ? `@${author} · ${caption}`
      : caption || (author ? `@${author}` : null);
  if (!title && !cover) return null;
  return {
    title,
    description: author ? `@${author}` : null,
    image: cover,
    source: "tiktok.com",
  };
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
  const ogImageRaw =
    extractMeta(html, "og:image") ??
    extractMeta(html, "og:image:secure_url") ??
    extractMeta(html, "twitter:image");
  const ogImage = isPlaceholderImage(ogImageRaw) ? null : ogImageRaw;
  const titleTag = extractTitleTag(html);

  return {
    title: ogTitle ?? titleTag,
    description: ogDesc,
    image: ogImage,
    source: url.hostname,
  };
}

export async function fetchUrlPreview(input: string): Promise<Preview> {
  // Trim whitespace — copy/paste from mobile share sheets often prepends a
  // leading space. new URL() tolerates trailing whitespace but not leading.
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return NULL;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return NULL;
  if (isPrivateHostname(url.hostname)) return NULL;

  if (isTikTok(url.hostname)) return fetchTikTokPreview(url);
  if (isInstagram(url.hostname)) return fetchInstagramPreview(url);
  return fetchGenericPreview(url);
}

/**
 * Server-side URL preview fetcher. Blueprint §7.1.
 *
 * Fetches an http(s) URL, parses og:title, og:image, og:description from the
 * response, and returns {title, description, image, source}. Heavily defensive:
 *
 *  - only http(s) protocols
 *  - hostname must be public (rejects localhost, 127.*, 10.*, 192.168.*, 169.254.*)
 *  - 4s timeout (TikTok is slow + sometimes hostile)
 *  - response capped at 1MB
 *  - non-text content-types short-circuited
 *
 * Returns nulls for fields it can't extract. Never throws — callers fall back
 * to manual entry.
 */
export type Preview = {
  title: string | null;
  description: string | null;
  image: string | null;
  source: string | null;   // hostname for display
};

const NULL: Preview = { title: null, description: null, image: null, source: null };

const FETCH_TIMEOUT_MS = 4000;
const MAX_BYTES = 1_000_000;

function isPrivateHostname(hostname: string): boolean {
  if (!hostname) return true;
  const h = hostname.toLowerCase();
  if (h === "localhost") return true;
  if (h === "0.0.0.0") return true;
  if (h.endsWith(".local")) return true;
  if (h.endsWith(".internal")) return true;
  // IPv4 private ranges
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  return false;
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

export async function fetchUrlPreview(input: string): Promise<Preview> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return NULL;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return NULL;
  if (isPrivateHostname(url.hostname)) return NULL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HeoMasuriBot/1.0; +https://heo-masuri-staging.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
  } catch {
    clearTimeout(timeout);
    return { ...NULL, source: url.hostname };
  }
  clearTimeout(timeout);

  if (!res.ok) return { ...NULL, source: url.hostname };
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.startsWith("text/") && !ct.includes("html")) return { ...NULL, source: url.hostname };

  // Stream + cap.
  const reader = res.body?.getReader();
  if (!reader) return { ...NULL, source: url.hostname };
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
  const html = chunks.map((c) => decoder.decode(c, { stream: true })).join("");

  const ogTitle = extractMeta(html, "og:title");
  const ogDesc = extractMeta(html, "og:description") ?? extractMeta(html, "description");
  const ogImage = extractMeta(html, "og:image");
  const titleTag = extractTitleTag(html);

  return {
    title: ogTitle ?? titleTag,
    description: ogDesc,
    image: ogImage,
    source: url.hostname,
  };
}

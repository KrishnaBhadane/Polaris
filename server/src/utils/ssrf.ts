import dns from 'dns';
import net from 'net';

export interface FetchedUrlResult {
  contentType: string;
  isHtml: boolean;
  isPdf: boolean;
  isImage: boolean;
  isVideo: boolean;
  text?: string;
  buffer?: Buffer;
  finalUrl: string;
}

/**
 * Checks if an IP address string is a private, loopback, link-local, or reserved address.
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;

  // Normalise IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  const isIpv4 = net.isIPv4(ip);
  const isIpv6 = net.isIPv6(ip);

  if (!isIpv4 && !isIpv6) {
    return true; // Not a valid IP
  }

  if (isIpv4) {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // 10.0.0.0/8 (Private)
    if (a === 10) return true;

    // 100.64.0.0/10 (Shared Address Space / CGNAT)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 169.254.0.0/16 (Link-Local / Cloud Metadata e.g. 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (a === 192 && b === 0 && parts[2] === 0) return true;

    // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && parts[2] === 2) return true;

    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;

    // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && (b === 18 || b === 19)) return true;

    // 198.51.100.0/24 (TEST-NET-2)
    if (a === 198 && b === 51 && parts[2] === 100) return true;

    // 203.0.113.0/24 (TEST-NET-3)
    if (a === 203 && b === 0 && parts[2] === 113) return true;

    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 (Reserved)
    if (a >= 240) return true;

    // Broadcast
    if (ip === '255.255.255.255') return true;

    return false;
  }

  if (isIpv6) {
    const lower = ip.toLowerCase();

    // Loopback
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;

    // Unspecified
    if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;

    // Unique Local Addresses (fc00::/7)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

    // Link-Local (fe80::/10)
    if (
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb')
    ) {
      return true;
    }

    // IPv4-mapped loopback/private check
    if (lower.startsWith('::ffff:')) {
      return isPrivateIp(lower.substring(7));
    }

    return false;
  }

  return true;
}

/**
 * Resolves a hostname to all IP addresses and ensures none are private.
 */
export async function validateHostIsPublic(hostname: string): Promise<void> {
  const normalizedHost = hostname.trim().toLowerCase();

  // Quick host strings blocklist
  if (
    normalizedHost === 'localhost' ||
    normalizedHost.endsWith('.localhost') ||
    normalizedHost.endsWith('.local') ||
    normalizedHost.endsWith('.internal') ||
    normalizedHost.endsWith('.corp') ||
    normalizedHost.endsWith('.home') ||
    normalizedHost.endsWith('.lan')
  ) {
    throw new Error('Access to local or internal network hostnames is prohibited.');
  }

  // If host is directly an IP literal
  if (net.isIP(normalizedHost)) {
    if (isPrivateIp(normalizedHost)) {
      throw new Error(`Access to private/internal IP address (${normalizedHost}) is prohibited.`);
    }
    return;
  }

  // Resolve hostname via DNS
  try {
    const addresses = await dns.promises.lookup(normalizedHost, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`Unable to resolve host: ${normalizedHost}`);
    }

    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        throw new Error(
          `Domain ${normalizedHost} resolves to private/internal IP (${record.address}), which is prohibited.`
        );
      }
    }
  } catch (err: any) {
    if (err.message?.includes('prohibited')) {
      throw err;
    }
    throw new Error(`DNS resolution failed for hostname "${normalizedHost}": ${err.message}`);
  }
}

/**
 * Strips HTML tags, script, style, nav, footer, headers and returns readable text.
 */
export function extractCleanTextFromHtml(html: string): string {
  if (!html) return '';

  let clean = html;

  // Remove script and style tags and their contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  clean = clean.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ');
  clean = clean.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');
  clean = clean.replace(/<!--[\s\S]*?-->/g, ' ');

  // Remove nav, footer, and header blocks
  clean = clean.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');
  clean = clean.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');
  clean = clean.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ');

  // Extract title if present
  let pageTitle = '';
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    pageTitle = titleMatch[1].trim();
  }

  // Replace block element tags with newlines
  clean = clean.replace(/<\/(div|p|h[1-6]|li|tr|section|article|blockquote)>/gi, '\n');
  clean = clean.replace(/<br\s*[\/]?>/gi, '\n');

  // Strip remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  clean = clean
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // Compress multiple whitespaces
  clean = clean.replace(/[ \t]+/g, ' ');
  clean = clean.replace(/\n\s*\n+/g, '\n\n');

  let result = clean.trim();
  if (pageTitle && !result.toLowerCase().startsWith(pageTitle.toLowerCase())) {
    result = `TITLE: ${pageTitle}\n\n${result}`;
  }

  // Truncate to maximum ~50,000 characters to fit context comfortably
  if (result.length > 50000) {
    result = result.substring(0, 50000) + '\n\n[Content truncated for analysis]';
  }

  return result;
}

/**
 * Safely fetches a public URL with multi-hop redirect validation and anti-SSRF checks.
 */
export async function validateAndFetchPublicUrl(
  rawUrl: string,
  maxBytes: number = 20 * 1024 * 1024,
  timeoutMs: number = 15000
): Promise<FetchedUrlResult> {
  let currentUrlStr = rawUrl.trim();
  const maxRedirects = 5;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrlStr);
    } catch {
      throw new Error(`Invalid URL format: "${currentUrlStr}"`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(
        `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS URLs are supported.`
      );
    }

    // SSRF Check on hostname and resolved IP for the current hop
    await validateHostIsPublic(parsed.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrlStr, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'manual', // Enforce manual redirect handling to validate each hop's destination!
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (POLARIS-SummaryWorkspace/1.0)',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,image/webp,image/png,image/jpeg,*/*;q=0.8',
        },
      });

      // Handle redirect status codes (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
          throw new Error(`HTTP ${response.status} redirect received without Location header.`);
        }

        // Resolve relative redirects against current URL
        const nextUrl = new URL(locationHeader, currentUrlStr).toString();
        redirectCount++;

        if (redirectCount > maxRedirects) {
          throw new Error('Too many HTTP redirects encountered (maximum 5 allowed).');
        }

        currentUrlStr = nextUrl;
        continue; // Next hop will validate the new host before fetching
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: HTTP ${response.status} ${response.statusText}`);
      }

      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const length = parseInt(contentLengthHeader, 10);
        if (!isNaN(length) && length > maxBytes) {
          throw new Error(
            `Resource size (${(length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit (${(maxBytes / (1024 * 1024)).toFixed(0)} MB).`
          );
        }
      }

      const rawContentType = response.headers.get('content-type') || 'text/html';
      const contentType = rawContentType.split(';')[0].trim().toLowerCase();

      const isHtml =
        contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
      const isPdf = contentType.includes('application/pdf');
      const isImage = contentType.startsWith('image/');
      const isVideo = contentType.startsWith('video/');

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > maxBytes) {
        throw new Error(
          `Downloaded content (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit (${(maxBytes / (1024 * 1024)).toFixed(0)} MB).`
        );
      }

      if (isHtml) {
        const htmlText = buffer.toString('utf-8');
        const cleanText = extractCleanTextFromHtml(htmlText);
        if (!cleanText || cleanText.trim().length === 0) {
          throw new Error('The web page contained no readable text to summarize.');
        }

        return {
          contentType,
          isHtml: true,
          isPdf: false,
          isImage: false,
          isVideo: false,
          text: cleanText,
          finalUrl: currentUrlStr,
        };
      }

      if (isPdf) {
        // PDF header verification
        if (buffer.length < 4 || buffer.subarray(0, 4).toString() !== '%PDF') {
          throw new Error('The downloaded link is not a valid PDF file.');
        }

        return {
          contentType: 'application/pdf',
          isHtml: false,
          isPdf: true,
          isImage: false,
          isVideo: false,
          buffer,
          finalUrl: currentUrlStr,
        };
      }

      if (isImage) {
        return {
          contentType,
          isHtml: false,
          isPdf: false,
          isImage: true,
          isVideo: false,
          buffer,
          finalUrl: currentUrlStr,
        };
      }

      if (isVideo) {
        return {
          contentType,
          isHtml: false,
          isPdf: false,
          isImage: false,
          isVideo: true,
          buffer,
          finalUrl: currentUrlStr,
        };
      }

      // Plain text or generic content fallback
      const textContent = buffer.toString('utf-8').trim();
      if (textContent.length > 0) {
        return {
          contentType: 'text/plain',
          isHtml: false,
          isPdf: false,
          isImage: false,
          isVideo: false,
          text: textContent.substring(0, 50000),
          finalUrl: currentUrlStr,
        };
      }

      throw new Error(`Unsupported content type at URL: ${contentType}`);
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs / 1000}s while fetching URL.`);
      }
      throw fetchErr;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error('Failed to resolve URL.');
}

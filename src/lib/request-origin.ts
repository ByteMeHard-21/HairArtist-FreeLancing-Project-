// Next can use an internal localhost URL even when the browser requested 127.0.0.1.
// The HTTP Host identifies the actual requested authority; never trust X-Forwarded-Host here.
export function isSameOrigin(request: Request, configuredOrigin?: string) {
  const source = request.headers.get("origin");
  if (!source || source === "null") return false;
  try {
    const origin = new URL(source);
    if (origin.origin !== source || !["http:", "https:"].includes(origin.protocol)) return false;
    if (configuredOrigin) return origin.origin === new URL(configuredOrigin).origin;
    const target = new URL(request.url);
    const host = request.headers.get("host") || target.host;
    if (/[\s/\\@#?]/.test(host)) return false;
    return origin.origin === new URL(target.protocol + "//" + host).origin;
  } catch { return false; }
}

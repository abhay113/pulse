export interface Env {
  API_ORIGIN: string;
  ASSETS?: Fetcher;
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Proxy /api/* to AWS API Gateway HTTP API
    if (url.pathname.startsWith('/api/')) {
      const origin = (env.API_ORIGIN || 'http://localhost:3001').replace(/\/+$/, '');
      const targetUrl = `${origin}${url.pathname}${url.search}`;

      const headers = new Headers(request.headers);
      headers.set('host', new URL(origin).host);

      try {
        const upstreamResponse = await fetch(targetUrl, {
          method: request.method,
          headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
          redirect: 'follow',
        });

        const newHeaders = new Headers(upstreamResponse.headers);
        newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
          newHeaders.set(k, v);
        }

        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers: newHeaders,
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: 'Bad Gateway',
            message: 'Upstream API unreachable',
            details: err instanceof Error ? err.message : String(err),
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
              ...SECURITY_HEADERS,
            },
          },
        );
      }
    }

    // Static assets fallback
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      const headers = new Headers(assetResponse.headers);
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
        headers.set(k, v);
      }
      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers,
      });
    }

    return new Response('Not Found', {
      status: 404,
      headers: SECURITY_HEADERS,
    });
  },
};


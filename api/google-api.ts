export const config = {
    runtime: 'edge',
};

const ALLOWED_PREFIXES = [
    '/v1beta',
    '/v1',
    '/google.ai.generativelanguage',
];

export default async function handler(request: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const url = new URL(request.url);
    // Remove the /api/google-api prefix to get the path relative to the Google API
    const path = url.pathname.replace(/^\/api\/google-api/, '');

    // Validate path against allowlist
    const isAllowed = ALLOWED_PREFIXES.some(prefix => path.startsWith(prefix));
    if (!isAllowed) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const params = url.search;
    const targetUrl = `https://generativelanguage.googleapis.com${path}${params}`;

    // Build minimal headers
    const requestHeaders = new Headers();
    requestHeaders.set('x-goog-api-key', apiKey);

    const contentType = request.headers.get('content-type');
    if (contentType) {
        requestHeaders.set('content-type', contentType);
    }

    // Forward Accept if present, or default to application/json
    const accept = request.headers.get('accept');
    if (accept) {
        requestHeaders.set('accept', accept);
    }

    try {
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: requestHeaders,
            body: request.body,
            // @ts-ignore - duplex is needed for streaming but types might complain
            duplex: 'half',
        });

        return response;
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({ error: 'Proxy error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    const url = new URL(request.url);
    // Remove the /api/google-api prefix to get the path relative to the Google API
    const path = url.pathname.replace(/^\/api\/google-api/, '');
    const params = url.search;

    const targetUrl = `https://generativelanguage.googleapis.com${path}${params}`;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-goog-api-key', process.env.GEMINI_API_KEY || '');
    requestHeaders.delete('host');
    requestHeaders.delete('connection'); // Let fetch handle connection headers

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
        return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
    }
}

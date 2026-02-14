import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
    matcher: '/google-api/:path*',
};

export default function middleware(request: NextRequest) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/google-api/, '');
    const params = url.search;

    const targetUrl = `https://generativelanguage.googleapis.com${path}${params}`;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-goog-api-key', process.env.GEMINI_API_KEY || '');
    // Remove host header to avoid conflicts
    requestHeaders.delete('host');

    return NextResponse.rewrite(new URL(targetUrl), {
        request: {
            headers: requestHeaders,
        },
    });
}

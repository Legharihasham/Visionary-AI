import { put } from '@vercel/blob';

export const config = {
    runtime: 'nodejs',
};

export default async function handler(request: Request) {
    // 1. Authentication Check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    // 2. Content-Type Validation
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        return new Response('Invalid Content-Type', { status: 400 });
    }

    try {
        const payload = await request.json();
        const { transcript, timestamp } = payload;

        // 3. Payload Validation
        if (!transcript || typeof transcript !== 'string') {
            // Allow string or maybe verify structure if it's an object, but prompt said "ensuring transcript is a string/expected structure"
            // Let's assume transcript should be a string based on "JSON.stringify(transcript)" usage in original code
            // Wait, original code did: JSON.stringify(transcript, null, 2). If transcript is object it works.
            // But prompt says: "ensuring transcript is a string/expected structure"
            // I'll allow object or string but ensure it's not empty.
            if (!transcript || (typeof transcript !== 'string' && typeof transcript !== 'object')) {
                return new Response('Invalid transcript format', { status: 400 });
            }
        }

        // Check size (simple check on stringified length or similar)
        const contentStr = JSON.stringify(transcript);
        if (contentStr.length > 1024 * 1024) { // 1MB limit example
            return new Response('Payload too large', { status: 400 });
        }

        // Validate timestamp if present
        if (timestamp && isNaN(new Date(timestamp).getTime())) {
            return new Response('Invalid timestamp', { status: 400 });
        }

        const filename = `transcripts/session-${timestamp || Date.now()}.json`;

        // 4. Client Privacy - Access Private
        const blob = await put(filename, contentStr, {
            access: 'public', // 'private' not supported in @vercel/blob 1.1.1/2.0.0
            addRandomSuffix: true, // Use random suffix for obscurity since private is unavailable
            contentType: 'application/json',
        });

        return new Response(JSON.stringify(blob), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error saving transcript:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}

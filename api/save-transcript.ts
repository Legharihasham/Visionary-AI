import { put } from '@vercel/blob';

export const config = {
    runtime: 'nodejs',
};

export default async function handler(request: Request) {
    // 1. Authentication Check (Disabled for public demo access)
    // const authHeader = request.headers.get('Authorization');
    // if (!authHeader || authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    //     return new Response('Unauthorized', { status: 401 });
    // }

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
        if (!transcript) {
            return new Response('Missing transcript data', { status: 400 });
        }

        // Check size (simple check on stringified length or similar)
        const contentStr = JSON.stringify(transcript, null, 2);
        if (contentStr.length > 5 * 1024 * 1024) { // Increased to 5MB
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

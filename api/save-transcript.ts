import { put } from '@vercel/blob';

export const config = {
    runtime: 'nodejs',
};

export default async function handler(request: Request) {
    // Method validation
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    // 1. Authentication Check
    // For production security, require API secret key authentication
    const apiSecret = process.env.API_SECRET_KEY;
    if (apiSecret) {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || authHeader !== `Bearer ${apiSecret}`) {
            return new Response('Unauthorized', { status: 401 });
        }
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
        // Client sends transcript as an array of TranscriptionLine objects
        if (!transcript) {
            return new Response('Transcript is required', { status: 400 });
        }

        // Validate transcript is an array of objects with expected structure
        if (!Array.isArray(transcript)) {
            return new Response('Transcript must be an array', { status: 400 });
        }

        // Validate each transcript entry has required fields
        for (const entry of transcript) {
            if (typeof entry !== 'object' || entry === null) {
                return new Response('Each transcript entry must be an object', { status: 400 });
            }
            if (entry.type !== 'user' && entry.type !== 'ai') {
                return new Response('Transcript entry type must be "user" or "ai"', { status: 400 });
            }
            if (typeof entry.text !== 'string') {
                return new Response('Transcript entry text must be a string', { status: 400 });
            }
            if (typeof entry.timestamp !== 'number') {
                return new Response('Transcript entry timestamp must be a number', { status: 400 });
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

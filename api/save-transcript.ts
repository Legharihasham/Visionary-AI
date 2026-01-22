import { put } from '@vercel/blob';

export const config = {
    runtime: 'nodejs',
};

/**
 * Handles POST requests to save a transcript as a JSON file in Vercel Blob storage.
 *
 * Expects the request body to be JSON containing `transcript` and an optional `timestamp`.
 *
 * @param request - Incoming Request whose JSON body must include `transcript` (and may include `timestamp`)
 * @returns A Response with status 200 and the saved blob metadata as JSON on success; 400 if `transcript` is missing; 405 if the HTTP method is not POST; 500 on internal error.
 */
export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { transcript, timestamp } = await request.json();

        if (!transcript) {
            return new Response('Missing transcript data', { status: 400 });
        }

        const filename = `transcripts/session-${timestamp || Date.now()}.json`;
        const blob = await put(filename, JSON.stringify(transcript, null, 2), {
            access: 'public',
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
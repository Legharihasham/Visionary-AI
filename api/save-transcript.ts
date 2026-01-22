import { put } from '@vercel/blob';

export const config = {
    runtime: 'nodejs',
};

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

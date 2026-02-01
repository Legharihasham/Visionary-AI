import { put } from '@vercel/blob';

export const config = {
    runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed');
    }

    // 2. Content-Type Validation
    // In Node.js environment, headers are lowercase properties on the object
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
        return res.status(400).send('Invalid Content-Type');
    }

    try {
        // Vercel automatically parses JSON body for Node.js functions
        const payload = req.body;
        const { transcript, timestamp } = payload;

        // 3. Payload Validation
        if (!transcript) {
            return res.status(400).send('Missing transcript data');
        }

        // Check size (simple check on stringified length)
        const contentStr = JSON.stringify(transcript, null, 2);
        if (contentStr.length > 5 * 1024 * 1024) { // 5MB limit
            return res.status(400).send('Payload too large');
        }

        // Validate timestamp if present
        if (timestamp && isNaN(new Date(timestamp).getTime())) {
            return res.status(400).send('Invalid timestamp');
        }

        const filename = `transcripts/session-${timestamp || Date.now()}.json`;

        // 4. Client Privacy - Access Public (unguessable URL)
        const blob = await put(filename, contentStr, {
            access: 'public',
            addRandomSuffix: true,
            contentType: 'application/json',
        });

        return res.status(200).json(blob);
    } catch (error) {
        console.error('Error saving transcript:', error);
        return res.status(500).send('Internal Server Error');
    }
}

// Vercel serverless function. Generates AI decoy (wrong) answers for a quiz
// question, once at creation time — never called during battle. Keeps the
// Anthropic API key server-side only; the browser bundle never sees it.
//
// Auth: requires the caller's Supabase access token (Authorization: Bearer)
// so only signed-in app users can trigger a (costed) generation, not anyone
// who finds the URL.

const DECOY_COUNT = 9;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!token || !supabaseUrl || !supabaseAnonKey) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    try {
        const authCheck = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
        });
        if (!authCheck.ok) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
    } catch (err) {
        console.error('Auth check failed:', err);
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    const { question, correct_answer, answer_type, category_name } = req.body || {};
    if (!question || !correct_answer) {
        res.status(400).json({ error: 'question and correct_answer are required' });
        return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'Server misconfigured: missing ANTHROPIC_API_KEY' });
        return;
    }

    const prompt = `You are generating multiple-choice quiz decoys (wrong answer options).

Question: ${question}
Correct answer: ${correct_answer}
${answer_type ? `Answer category/type: ${answer_type}` : ''}
${category_name ? `Quiz topic: ${category_name}` : ''}

Generate exactly ${DECOY_COUNT} plausible but INCORRECT answers for this question. Each one must:
- Match the same kind/format as the correct answer (e.g. other country names for a country answer, other numbers for a numeric answer, other people's names for a name answer).
- Be a genuinely plausible wrong answer someone familiar with the topic might mistakenly pick — not random or absurd.
- Be clearly and unambiguously wrong for THIS question.
- Be distinct from the correct answer and from each other.
- Match the correct answer's length/style (a short answer gets short decoys, a phrase gets phrase-length decoys).

Respond with ONLY a JSON array of exactly ${DECOY_COUNT} strings, nothing else — no markdown, no explanation.`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 500,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Anthropic API error:', response.status, errText);
            res.status(502).json({ error: 'AI service error' });
            return;
        }

        const data = await response.json();
        const text = data?.content?.[0]?.text?.trim() || '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('Could not find JSON array in AI response:', text);
            res.status(502).json({ error: 'Could not parse AI response' });
            return;
        }

        let decoys;
        try {
            decoys = JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
            console.error('Failed to parse AI response JSON:', parseErr, text);
            res.status(502).json({ error: 'Could not parse AI response' });
            return;
        }

        if (!Array.isArray(decoys) || !decoys.every(d => typeof d === 'string' && d.trim())) {
            console.error('Unexpected AI response shape:', decoys);
            res.status(502).json({ error: 'Invalid AI response shape' });
            return;
        }

        // Dedupe and drop anything identical to the correct answer, but don't
        // otherwise gate on the exact count — a handful of usable decoys is
        // still better than none.
        const seen = new Set([correct_answer.trim().toLowerCase()]);
        const cleaned = [];
        for (const d of decoys) {
            const trimmed = d.trim();
            const key = trimmed.toLowerCase();
            if (!trimmed || seen.has(key)) continue;
            seen.add(key);
            cleaned.push(trimmed);
        }

        res.status(200).json({ decoys: cleaned });
    } catch (err) {
        console.error('generate-decoys error:', err);
        res.status(500).json({ error: 'Internal error' });
    }
}

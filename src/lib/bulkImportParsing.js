// Bulk import (CSV/Excel) мөр бүрийг quiz_items-д зориулж бэлтгэх, шалгах цэвэр логик —
// UI-аас тусад нь unit test хийхийн тулд.

const VALID_DIFFICULTIES = new Set(['easy', 'normal', 'hard']);
const DIFFICULTY_ALIASES = {
    'хялбар': 'easy', 'easy': 'easy', 'e': 'easy',
    'дунд': 'normal', 'normal': 'normal', 'n': 'normal',
    'хэцүү': 'hard', 'hard': 'hard', 'h': 'hard',
};

export function normalizeDifficulty(raw) {
    const key = (raw || '').trim().toLowerCase();
    if (!key) return 'normal';
    return DIFFICULTY_ALIASES[key] || (VALID_DIFFICULTIES.has(key) ? key : null);
}

// records: papaparse/xlsx-ийн парс хийсэн, header-ээс үүссэн түлхүүртэй объектуудын массив.
export function rowsFromParsed(records) {
    return records.map((r, i) => {
        const get = (...names) => {
            for (const n of names) {
                const key = Object.keys(r).find(k => k.trim().toLowerCase().startsWith(n));
                if (key && r[key] != null && String(r[key]).trim()) return String(r[key]).trim();
            }
            return '';
        };
        const question = get('асуулт', 'question');
        const answer = get('хариулт', 'answer');
        const answerType = get('төрөл', 'type');
        const difficultyRaw = get('түвшин', 'хэцүү', 'difficulty');
        const difficulty = normalizeDifficulty(difficultyRaw);

        const errors = [];
        if (!question) errors.push('Асуулт хоосон байна');
        if (!answer) errors.push('Хариулт хоосон байна');
        if (difficulty === null) errors.push(`Түвшин "${difficultyRaw}" танигдсангүй (easy/normal/hard)`);

        return {
            rowNum: i + 2, // header = мөр 1
            question,
            answer,
            answerType,
            difficulty: difficulty || 'normal',
            errors,
        };
    });
}

import { describe, it, expect } from 'vitest';
import { normalizeDifficulty, rowsFromParsed } from './bulkImportParsing.js';

describe('normalizeDifficulty', () => {
    it('defaults to normal when empty', () => {
        expect(normalizeDifficulty('')).toBe('normal');
        expect(normalizeDifficulty(undefined)).toBe('normal');
    });

    it('accepts Mongolian and English aliases, case-insensitively', () => {
        expect(normalizeDifficulty('Хялбар')).toBe('easy');
        expect(normalizeDifficulty('HARD')).toBe('hard');
        expect(normalizeDifficulty('normal')).toBe('normal');
    });

    it('returns null for an unrecognized value', () => {
        expect(normalizeDifficulty('impossible')).toBeNull();
    });
});

describe('rowsFromParsed', () => {
    it('maps Mongolian headers and flags missing question/answer', () => {
        const rows = rowsFromParsed([
            { 'Асуулт': 'Улаанбаатар аль улсын нийслэл вэ?', 'Хариулт': 'Монгол', 'Түвшин': 'easy' },
            { 'Асуулт': '', 'Хариулт': 'Answer' },
        ]);
        expect(rows[0].errors).toEqual([]);
        expect(rows[0].difficulty).toBe('easy');
        expect(rows[1].errors).toContain('Асуулт хоосон байна');
    });

    it('flags an unrecognized difficulty value', () => {
        const rows = rowsFromParsed([{ 'Асуулт': 'Q', 'Хариулт': 'A', 'Түвшин': 'super hard' }]);
        expect(rows[0].errors.some(e => e.includes('танигдсангүй'))).toBe(true);
    });

    it('accepts English headers too', () => {
        const rows = rowsFromParsed([{ question: 'Q', answer: 'A', type: 'country', difficulty: 'hard' }]);
        expect(rows[0]).toMatchObject({ question: 'Q', answer: 'A', answerType: 'country', difficulty: 'hard', errors: [] });
    });

    it('numbers rows starting at 2 (header is row 1)', () => {
        const rows = rowsFromParsed([{ question: 'A', answer: 'B' }, { question: 'C', answer: 'D' }]);
        expect(rows.map(r => r.rowNum)).toEqual([2, 3]);
    });
});

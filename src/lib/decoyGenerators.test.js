import { describe, it, expect } from 'vitest';
import { generateRuleBasedDecoys } from './decoyGenerators.js';

describe('generateRuleBasedDecoys', () => {
    it('returns [] for an unrecognized answer_type', () => {
        expect(generateRuleBasedDecoys('tactic', 'Retake', 3)).toEqual([]);
    });

    it('returns [] when answerType or correctAnswer is missing', () => {
        expect(generateRuleBasedDecoys(null, 'Египет', 3)).toEqual([]);
        expect(generateRuleBasedDecoys('country', '', 3)).toEqual([]);
    });

    it('picks decoys from the static pool, excluding the correct answer', () => {
        const decoys = generateRuleBasedDecoys('country', 'Орос', 5);
        expect(decoys.length).toBeGreaterThan(0);
        expect(decoys).not.toContain('Орос');
        expect(new Set(decoys).size).toBe(decoys.length); // no duplicates
    });

    it('generates nearby numbers for "year", excluding the correct year', () => {
        const decoys = generateRuleBasedDecoys('year', '2021', 4);
        expect(decoys.length).toBeGreaterThan(0);
        for (const d of decoys) {
            expect(d).not.toBe('2021');
            expect(Number.isInteger(Number(d))).toBe(true);
        }
    });

    it('generates nearby numbers for "count", allowing 0 but not negative', () => {
        const decoys = generateRuleBasedDecoys('count', '2', 4);
        for (const d of decoys) {
            expect(Number(d)).toBeGreaterThanOrEqual(0);
            expect(d).not.toBe('2');
        }
    });

    it('returns [] for "count"/"year" when the correct answer is not a plain integer', () => {
        expect(generateRuleBasedDecoys('count', '2 (A, B)', 3)).toEqual([]);
    });
});

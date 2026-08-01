import { describe, it, expect } from 'vitest';
import { shuffle } from './arrayUtils.js';

describe('shuffle', () => {
    it('keeps the same elements, only reordering them', () => {
        const input = [1, 2, 3, 4, 5];
        const result = shuffle(input);
        expect(result).toHaveLength(input.length);
        expect([...result].sort()).toEqual([...input].sort());
    });

    it('does not mutate the original array', () => {
        const input = [1, 2, 3];
        shuffle(input);
        expect(input).toEqual([1, 2, 3]);
    });
});

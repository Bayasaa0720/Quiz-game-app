import { describe, it, expect } from 'vitest';
import { getFloorState, clearedCount, clampDamage, enemyVariant } from './towerLogic.js';

describe('getFloorState', () => {
    it('marks floors at or below highestCleared as cleared', () => {
        expect(getFloorState(0, 2)).toBe('cleared');
        expect(getFloorState(2, 2)).toBe('cleared');
    });

    it('marks the floor right after highestCleared as current', () => {
        expect(getFloorState(3, 2)).toBe('current');
        expect(getFloorState(0, -1)).toBe('current');
    });

    it('marks anything further ahead as locked', () => {
        expect(getFloorState(4, 2)).toBe('locked');
        expect(getFloorState(1, -1)).toBe('locked');
    });
});

describe('clearedCount', () => {
    it('treats -1/undefined/null as zero floors cleared', () => {
        expect(clearedCount(-1)).toBe(0);
        expect(clearedCount(undefined)).toBe(0);
        expect(clearedCount(null)).toBe(0);
    });

    it('converts highestCleared index into a 1-based count', () => {
        expect(clearedCount(0)).toBe(1);
        expect(clearedCount(4)).toBe(5);
    });
});

describe('clampDamage', () => {
    it('subtracts damage from hp', () => {
        expect(clampDamage(30, 10)).toBe(20);
    });

    it('never goes below zero', () => {
        expect(clampDamage(5, 10)).toBe(0);
        expect(clampDamage(0, 1)).toBe(0);
    });
});

describe('enemyVariant', () => {
    it('cycles through orc, demon, blood by floor index', () => {
        expect(enemyVariant(0)).toBe('orc');
        expect(enemyVariant(1)).toBe('demon');
        expect(enemyVariant(2)).toBe('blood');
        expect(enemyVariant(3)).toBe('orc');
    });

    it('defaults to orc when the index is missing', () => {
        expect(enemyVariant(undefined)).toBe('orc');
        expect(enemyVariant(null)).toBe('orc');
    });
});

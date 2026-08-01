// Цамхаг/давхрын төлөв тооцоолох цэвэр функцууд — UI-аас тусад нь unit test хийхийн тулд.

export function getFloorState(floorIndex, highestCleared) {
    if (floorIndex <= highestCleared) return 'cleared';
    if (floorIndex === highestCleared + 1) return 'current';
    return 'locked';
}

export function clearedCount(highestCleared) {
    return Math.max(0, (highestCleared ?? -1) + 1);
}

export function clampDamage(hp, amount) {
    return Math.max(0, hp - amount);
}

const ENEMY_VARIANTS = ['orc', 'demon', 'blood'];

export function enemyVariant(floorIndex) {
    const idx = ((floorIndex ?? 0) % ENEMY_VARIANTS.length + ENEMY_VARIANTS.length) % ENEMY_VARIANTS.length;
    return ENEMY_VARIANTS[idx];
}

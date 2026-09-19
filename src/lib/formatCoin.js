// Supabase numeric багана JS руу string-ээр ирдэг ("0.30"), тиймээс тоо
// болгон харьцуулах/дэлгэцэнд гаргахын өмнө үргэлж үүгээр дамжуулна.
export function formatCoin(value) {
    const n = Number(value) || 0;
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

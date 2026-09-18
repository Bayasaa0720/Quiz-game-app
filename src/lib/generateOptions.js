import { shuffle } from './arrayUtils.js';
import { generateRuleBasedDecoys } from './decoyGenerators.js';

// currentQ-тай ижил "төрлийн" (зурган/текст, ижил answer_type) 3 буруу
// хариулт сонгоно; pool хангалтгүй бол rule-based decoy-гоор нөхнө.
// Battle.jsx (цамхаг) болон Duel.jsx (1v1) хоёулаа ашигладаг.
export function buildOptions(currentQ, pool) {
    const correct = { text: currentQ.correct_answer, img: currentQ.answer_image_url, isCorrect: true };
    const displayValue = (q) => q.answer_image_url || q.correct_answer;
    const isImage = (q) => !!q.answer_image_url;
    const others = pool.filter(q => q.id !== currentQ.id);
    const kindPool = others.filter(q => isImage(q) === isImage(currentQ));
    const sameType = kindPool.filter(q => (q.answer_type || null) === (currentQ.answer_type || null));
    const rest = kindPool.filter(q => !sameType.includes(q));
    const candidates = [...shuffle(sameType), ...shuffle(rest)];

    const seenValues = new Set([displayValue(currentQ)]);
    const wrongs = [];
    for (const q of candidates) {
        if (wrongs.length >= 3) break;
        const value = displayValue(q);
        if (seenValues.has(value)) continue;
        seenValues.add(value);
        wrongs.push({ text: q.correct_answer, img: q.answer_image_url, isCorrect: false });
    }

    if (wrongs.length < 3 && !isImage(currentQ)) {
        const needed = 3 - wrongs.length;
        const ruleBased = generateRuleBasedDecoys(currentQ.answer_type, currentQ.correct_answer, needed + 2);
        for (const text of ruleBased) {
            if (wrongs.length >= 3) break;
            if (seenValues.has(text)) continue;
            seenValues.add(text);
            wrongs.push({ text, img: null, isCorrect: false });
        }
    }

    return shuffle([correct, ...wrongs]);
}

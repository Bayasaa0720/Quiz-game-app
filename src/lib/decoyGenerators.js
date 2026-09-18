// Zero-cost, offline decoy generation — no AI/API calls. Used only as a
// top-up when the category pool doesn't have enough same-answer_type
// questions to fill out the 3 wrong options (see Battle.jsx). Scoped to
// answer_type values that have a safe, well-defined shape to template;
// unrecognized types return [] and the pool stays the only source, same
// as before this existed.

const COUNTRIES = [
    'Орос', 'Украйн', 'Польш', 'Герман', 'Франц', 'Дани', 'Швед', 'Норвеги',
    'Финлянд', 'Их Британи', 'Итали', 'Испани', 'Португал', 'Бразил',
    'Америк', 'Канад', 'Австрали', 'Хятад', 'Япон', 'Өмнөд Солонгос',
    'Казахстан', 'Литва', 'Латви', 'Эстони', 'Болгар', 'Румын', 'Чех',
    'Словак', 'Нидерланд', 'Бельги',
];

const TEAMS = [
    'Astralis', 'Natus Vincere', 'FaZe Clan', 'G2 Esports', 'Team Vitality',
    'Team Liquid', 'Cloud9', 'ENCE', 'MOUZ', 'Heroic', 'Team Spirit',
    'Complexity', 'Ninjas in Pyjamas', 'Fnatic', 'BIG',
];

const TOURNAMENTS = [
    'PGL Major Antwerp', 'IEM Katowice', 'BLAST Premier World Final',
    'ESL Pro League Finals', 'DreamHack Masters', 'PGL Major Copenhagen',
    'IEM Cologne', 'BLAST.tv Paris Major',
];

const PLAYERS = [
    's1mple', 'ZywOo', 'NiKo', 'device', 'sh1ro', 'm0NESY', 'donk', 'broky',
    'karrigan', 'electroNic', 'Ax1Le', 'blameF', 'Twistzz', 'huNter-',
];

const SITES = ['A site', 'B site', 'Mid', 'Connector', 'T spawn', 'CT spawn'];

const ANIMALS = ['Барс', 'Арслан', 'Чоно', 'Заан', 'Могой', 'Үнэг', 'Бар', 'Гахай', 'Бух', 'Царцаа'];

const CIVILIZATIONS = ['Майя', 'Ацтек', 'Египет', 'Грек', 'Ром', 'Перс', 'Инк', 'Хятад'];

const STATIC_POOLS = {
    country: COUNTRIES,
    team: TEAMS,
    tournament: TOURNAMENTS,
    player: PLAYERS,
    site: SITES,
    animal: ANIMALS,
    civilization: CIVILIZATIONS,
};

function pickFromPool(pool, correctAnswer, count) {
    const candidates = pool.filter(v => v.toLowerCase() !== correctAnswer.trim().toLowerCase());
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    return candidates.slice(0, count);
}

function nearbyNumberDecoys(correctAnswer, count, { min, maxOffset }) {
    const n = Number(correctAnswer.trim());
    if (!Number.isInteger(n) || String(n) !== correctAnswer.trim()) return [];
    const candidates = new Set();
    let attempts = 0;
    while (candidates.size < count && attempts < 40) {
        attempts++;
        const offset = Math.floor(Math.random() * maxOffset) + 1;
        const sign = Math.random() < 0.5 ? -1 : 1;
        const value = n + sign * offset;
        if (value !== n && value >= min) candidates.add(String(value));
    }
    return [...candidates];
}

// answerType: free-text label from QuizCreator (e.g. "country", "year").
// correctAnswer: the question's correct_answer text.
// count: how many decoys to try to produce (best-effort — may return fewer).
export function generateRuleBasedDecoys(answerType, correctAnswer, count) {
    if (!answerType || !correctAnswer || count <= 0) return [];
    const type = answerType.trim().toLowerCase();

    if (type === 'year') return nearbyNumberDecoys(correctAnswer, count, { min: 1990, maxOffset: 6 });
    if (type === 'count') return nearbyNumberDecoys(correctAnswer, count, { min: 0, maxOffset: 5 });

    const pool = STATIC_POOLS[type];
    return pool ? pickFromPool(pool, correctAnswer, count) : [];
}

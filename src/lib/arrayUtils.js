// Fisher-Yates. `arr.sort(() => 0.5 - Math.random())` looks equivalent but is
// statistically biased (comparator-sort shuffles skew toward certain
// permutations depending on the engine's sort algorithm) — this gives a
// uniform random permutation.
export function shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// Weighted random order (Efraimidis-Spirakis): items with a higher weight
// are statistically more likely to land earlier, but it's still a shuffle —
// not a deterministic sort — so a weight-1 item can still come up first.
// Used by Review mode to surface frequently-missed questions more often
// without ever fully excluding the rest.
export function weightedShuffle(arr, weightFn) {
    return arr
        .map(item => ({ item, key: Math.pow(Math.random(), 1 / Math.max(weightFn(item), 0.0001)) }))
        .sort((a, b) => b.key - a.key)
        .map(({ item }) => item);
}

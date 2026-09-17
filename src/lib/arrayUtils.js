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

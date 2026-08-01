export function shuffle(arr) {
    return [...arr].sort(() => 0.5 - Math.random());
}

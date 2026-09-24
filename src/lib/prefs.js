// Клиент талын UI тохиргоонууд (Profile > Тохиргоо) — localStorage-д хадгална,
// sound.js-ийн isMuted/setMuted-тэй адил хэв маягтай.

const REDUCE_ANIM_KEY = 'quiz_reduce_animations';
const KEYBOARD_SHORTCUTS_KEY = 'quiz_keyboard_shortcuts';

let reduceAnimations = localStorage.getItem(REDUCE_ANIM_KEY) === 'true';
let keyboardShortcuts = localStorage.getItem(KEYBOARD_SHORTCUTS_KEY) !== 'false'; // default: асаалттай

export function isReduceAnimations() {
    return reduceAnimations;
}

export function setReduceAnimations(value) {
    reduceAnimations = value;
    localStorage.setItem(REDUCE_ANIM_KEY, String(value));
    document.documentElement.classList.toggle('reduce-motion', value);
}

export function isKeyboardShortcutsEnabled() {
    return keyboardShortcuts;
}

export function setKeyboardShortcutsEnabled(value) {
    keyboardShortcuts = value;
    localStorage.setItem(KEYBOARD_SHORTCUTS_KEY, String(value));
}

// Танилцуулга (Onboarding) дэлгэцийг хэрэглэгч бүрт нэг л удаа харуулна.
export function hasSeenOnboarding(userId) {
    return localStorage.getItem(`quiz_onboarding_seen_${userId}`) === 'true';
}

export function markOnboardingSeen(userId) {
    localStorage.setItem(`quiz_onboarding_seen_${userId}`, 'true');
}

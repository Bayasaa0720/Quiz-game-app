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

// Onboarding wizard-ийн эхний 2 алхам (танилцуулга/дүрэм) нэвтрэхээс ӨМНӨ
// харагддаг тул хэрэглэгчийн id-аар биш, энгийн browser-local флагаар
// л нэг удаа харуулна (дараа нь logout/login хийхэд шууд 3-р алхам буюу
// нэвтрэх/бүртгүүлэх дэлгэц рүү шулуухан очно).
const ONBOARDING_INTRO_KEY = 'quiz_onboarding_intro_seen';

export function hasSeenOnboardingIntro() {
    return localStorage.getItem(ONBOARDING_INTRO_KEY) === 'true';
}

export function markOnboardingIntroSeen() {
    localStorage.setItem(ONBOARDING_INTRO_KEY, 'true');
}

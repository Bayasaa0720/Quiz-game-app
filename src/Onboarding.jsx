import { useState } from 'react';
import Button from './components/Button.jsx';
import AuthForm from './AuthForm.jsx';
import { hasSeenOnboardingIntro, markOnboardingIntroSeen } from './lib/prefs.js';
import './Onboarding.css';

// Deck-ийн баруун талын decorative жагсаалт (Home/TowerSelect-ийн бодит
// давхар/цамхагтай холбоогүй, зөвхөн Onboarding-ийн флаворын хувьд).
const TIERS = [
    { n: '06', label: 'Summit', icon: '🔒' },
    { n: '05', label: 'Master', icon: '🔒' },
    { n: '04', label: 'Advanced', icon: '🚩', current: true },
    { n: '03', label: 'Trial', icon: '✓' },
    { n: '02', label: 'Practice', icon: '✓' },
    { n: '01', label: 'Basics', icon: '✓' },
];

function TierPreview() {
    return (
        <div className="onboarding-tier-preview">
            {TIERS.map(t => (
                <div key={t.n} className={`onboarding-tier-row${t.current ? ' current' : ''}`}>
                    <span className="onboarding-tier-index">{t.n}</span>
                    <span className="onboarding-tier-name">{t.label}</span>
                    <span className="onboarding-tier-icon" aria-hidden="true">{t.icon}</span>
                </div>
            ))}
        </div>
    );
}

function StepShell({ step, children }) {
    return (
        <div className="onboarding-shell">
            <div className="onboarding-shell-left">
                <div className="onboarding-progress-dots">
                    {[1, 2, 3].map(n => <span key={n} className={n <= step ? 'active' : ''} />)}
                </div>
                {children}
                <p className="onboarding-step-label">Step {step} / 3</p>
            </div>
            <TierPreview />
        </div>
    );
}

// Tower Climb App.html deck-ийн 3-алхамт wizard: 1) танилцуулга, 2) дүрэм,
// 3) нэвтрэх/бүртгүүлэх (+ зочны горим). Эхлээд нэвтрэхээс ӨМНӨ харагдана
// (App.jsx-ийн анхны view). "Та хэн бэ?" гэсэн тусдаа role-picker алхам
// САНААТАЙГААР алга — role сонголт Register-ийн өөрийн формд хэвээрээ.
// Лого зөвхөн App.jsx-ийн header-т нэг л удаа харагдана (энд давхардуулахгүй).
export default function Onboarding({ onAuthSuccess, onGuestContinue }) {
    // Дахин зочилсон үед (browser-д аль хэдийн үзсэн тэмдэг байгаа) шууд
    // 3-р алхам руу — танилцуулга/дүрмийг дахин харуулахгүй.
    const [step, setStep] = useState(hasSeenOnboardingIntro() ? 3 : 1);

    const goToAuthStep = () => {
        markOnboardingIntroSeen();
        setStep(3);
    };

    if (step === 1) {
        return (
            <StepShell step={1}>
                <span className="eyebrow-label">TOWER CLIMB</span>
                <h1 className="onboarding-headline">Every question is a step. Every floor has a guardian.</h1>
                <p className="onboarding-sub">Turn what you study into towers. Answer correctly to beat each floor's guardian and keep climbing.</p>
                <div className="onboarding-actions">
                    <Button onClick={() => setStep(2)}>Next →</Button>
                    <button type="button" className="onboarding-skip" onClick={goToAuthStep}>Skip</button>
                </div>
            </StepShell>
        );
    }

    if (step === 2) {
        return (
            <StepShell step={2}>
                <span className="eyebrow-label">RULES</span>
                <h1 className="onboarding-headline">Miss 3 times and you fall from that floor.</h1>
                <p className="onboarding-sub">
                    10 seconds per question. Buy armor from the Shop for extra lives.
                    Climb higher to earn coins and challenge friends to 1v1 duels.
                </p>
                <div className="onboarding-actions">
                    <Button onClick={goToAuthStep}>Next →</Button>
                    <button type="button" className="onboarding-skip" onClick={goToAuthStep}>Skip</button>
                </div>
            </StepShell>
        );
    }

    // step === 3: нэгдсэн AuthForm (Нэвтрэх/Бүртгүүлэх tab-тай), доор нь
    // зочны горимын холбоос, баруун талд бусад алхамтай адил tier panel.
    return (
        <div className="onboarding-shell">
            <div className="onboarding-shell-left onboarding-auth-step">
                <AuthForm onAuthSuccess={onAuthSuccess} />
                <button type="button" className="onboarding-guest-link" onClick={onGuestContinue}>
                    <span>👁️ Try it without registering</span>
                    <span className="onboarding-guest-hint">World tower only · progress isn't saved</span>
                </button>
                <p className="onboarding-step-label">Step 3 / 3</p>
            </div>
            <TierPreview />
        </div>
    );
}

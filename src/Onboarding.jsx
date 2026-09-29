import { useState } from 'react';
import Button from './components/Button.jsx';
import AuthForm from './AuthForm.jsx';
import { hasSeenOnboardingIntro, markOnboardingIntroSeen } from './lib/prefs.js';
import './Onboarding.css';

// Deck-ийн баруун талын decorative жагсаалт (Home/TowerSelect-ийн бодит
// давхар/цамхагтай холбоогүй, зөвхөн Onboarding-ийн флаворын хувьд).
const TIERS = [
    { n: '06', label: 'Оргил', icon: '🔒' },
    { n: '05', label: 'Мастер', icon: '🔒' },
    { n: '04', label: 'Ахисан', icon: '🚩', current: true },
    { n: '03', label: 'Шалгалт', icon: '✓' },
    { n: '02', label: 'Дадлага', icon: '✓' },
    { n: '01', label: 'Суурь', icon: '✓' },
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
                <p className="onboarding-step-label">Алхам {step} / 3</p>
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
                <h1 className="onboarding-headline">Асуулт бүр нэг шат. Цамхаг тэр шатаар өснө.</h1>
                <p className="onboarding-sub">Хичээлээ цамхаг болгон давтаж, давхар бүрийн хамгаалагчийг зөв хариултаар яли.</p>
                <div className="onboarding-actions">
                    <Button onClick={() => setStep(2)}>Дараах →</Button>
                    <button type="button" className="onboarding-skip" onClick={goToAuthStep}>Алгасах</button>
                </div>
            </StepShell>
        );
    }

    if (step === 2) {
        return (
            <StepShell step={2}>
                <span className="eyebrow-label">ДҮРЭМ</span>
                <h1 className="onboarding-headline">3 удаа алдвал тэр давхарт унана.</h1>
                <p className="onboarding-sub">
                    Асуулт бүрт 10 секунд. Дэлгүүрээс армор авбал нэмэлт амьтай орно.
                    Дээшлэх тусам coin цуглуулж, найзтайгаа 1v1 өрсөлдөнө.
                </p>
                <div className="onboarding-actions">
                    <Button onClick={goToAuthStep}>Дараах →</Button>
                    <button type="button" className="onboarding-skip" onClick={goToAuthStep}>Алгасах</button>
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
                    <span>👁️ Бүртгүүлэхгүйгээр туршиж үзэх</span>
                    <span className="onboarding-guest-hint">Зөвхөн World tower тоглоно · явц хадгалагдахгүй</span>
                </button>
                <p className="onboarding-step-label">Алхам 3 / 3</p>
            </div>
            <TierPreview />
        </div>
    );
}

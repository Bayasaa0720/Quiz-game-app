import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import './Onboarding.css';

const STEPS = [
    { n: '01', title: 'Цамхаг сонго', desc: 'Үндсэн цамхгуудаас, эсвэл өөрийн асуултаас цамхаг үүсгэ.' },
    { n: '02', title: 'Давхар дийл', desc: '3 удаа алдвал тэр давхарт унана. Армор нэмэлт амь болно.' },
    { n: '03', title: 'Оноо ба найзууд', desc: 'Дээшлэх тусам coin олж, найзтайгаа 1v1 өрсөлд.' },
];

export default function Onboarding({ onContinue }) {
    return (
        <Card className="onboarding-page">
            <div className="onboarding-logo">🗼 Tower Climb</div>
            <h1 className="onboarding-headline">Асуулт бүр нэг шат. Цамхаг тэр шатаар өснө.</h1>
            <p className="onboarding-sub">Хичээлээ цамхаг болгон уншиж, найзтайгаа өрсөлдөж, багш анги удирдана.</p>

            <div className="onboarding-steps">
                {STEPS.map(s => (
                    <div key={s.n} className="onboarding-step">
                        <span className="eyebrow-label">{s.n}</span>
                        <h3>{s.title}</h3>
                        <p>{s.desc}</p>
                    </div>
                ))}
            </div>

            <div className="onboarding-actions">
                <Button onClick={onContinue}>Эхний цамхаг руу</Button>
                <button type="button" className="onboarding-skip" onClick={onContinue}>Дараа нь тохируулах</button>
            </div>
        </Card>
    );
}

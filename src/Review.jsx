import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { buildOptions } from './lib/generateOptions.js';
import { shuffle } from './lib/arrayUtils.js';
import { playCorrectHit, playWrongHit } from './sound.js';
import './Battle.css';

// Дийлсэн давхруудын асуултуудаас санамсаргүйгээр сэргээх дадлага —
// цамхгийн ахиц/HP-той ямар ч холбоогүй, зөвхөн тоглогчийн санах ойд
// хуучин асуултуудыг дахин сэргээлгэх зорилготой (floor-ын 5 асуулт
// дийлсний дараа хэзээ ч дахин гарч ирдэггүй тул мартагддаг гэсэн
// санаанаас). Шинэ schema/RPC хэрэггүй, зөвхөн уншиж тоглоно.
export default function Review({ categoryId, categoryName, highestCleared, onBack }) {
    const [status, setStatus] = useState('loading'); // loading | error | empty | select | playing | done
    const [pool, setPool] = useState([]);
    const [clearedItems, setClearedItems] = useState([]);
    const [queue, setQueue] = useState([]);
    const [index, setIndex] = useState(0);
    const [options, setOptions] = useState([]);
    const [selectedChoice, setSelectedChoice] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [isEndless, setIsEndless] = useState(false);
    const [customCount, setCustomCount] = useState('');

    const load = useCallback(async () => {
        setStatus('loading');
        try {
            const { data: floors, error: floorErr } = await supabase
                .from('tower_floors')
                .select('floor_index, question_ids')
                .eq('category_id', categoryId)
                .lte('floor_index', highestCleared);
            if (floorErr) throw floorErr;
            const clearedIds = new Set((floors || []).flatMap(f => f.question_ids));
            if (clearedIds.size === 0) {
                setStatus('empty');
                return;
            }

            const { data: poolData, error: poolErr } = await supabase
                .from('quiz_items')
                .select('*')
                .eq('category_id', categoryId);
            if (poolErr) throw poolErr;
            setPool(poolData || []);
            setClearedItems((poolData || []).filter(q => clearedIds.has(q.id)));
            setStatus('select');
        } catch (err) {
            console.error('Review load error:', err);
            setStatus('error');
        }
    }, [categoryId, highestCleared]);

    useEffect(() => { load(); }, [load]);

    const startSession = (count, endless = false) => {
        const n = endless ? clearedItems.length : Math.max(1, Math.min(count, clearedItems.length));
        setIsEndless(endless);
        setQueue(shuffle(clearedItems).slice(0, n));
        setIndex(0);
        setCorrectCount(0);
        setWrongCount(0);
        setStatus('playing');
    };

    useEffect(() => {
        if (status !== 'playing') return;
        const currentQ = queue[index];
        if (!currentQ) return;
        setOptions(buildOptions(currentQ, pool));
        setIsAnswered(false);
        setSelectedChoice(null);
    }, [status, queue, index, pool]);

    const handleSelect = (opt) => {
        if (isAnswered) return;
        setSelectedChoice(opt);
        setIsAnswered(true);
        if (opt.isCorrect) {
            playCorrectHit();
            setCorrectCount(c => c + 1);
        } else {
            playWrongHit();
            setWrongCount(c => c + 1);
        }
    };

    const handleNext = () => {
        if (index + 1 >= queue.length) {
            if (isEndless) {
                setQueue(shuffle(clearedItems));
                setIndex(0);
                return;
            }
            setStatus('done');
            return;
        }
        setIndex(i => i + 1);
    };

    const handleStop = () => setStatus('done');

    if (status === 'loading') return <p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>;
    if (status === 'error') return <ErrorState message="Сэргээх асуултуудыг ачаалахад алдаа гарлаа." onRetry={load} />;

    if (status === 'empty') {
        return (
            <div className="battle-page battle-result">
                <h2>📚 Одоогоор сэргээх зүйл алга</h2>
                <p>Дор хаяж нэг давхар дийлсний дараа энд сэргээх асуултууд гарч ирнэ.</p>
                <div className="battle-result-actions">
                    <Button variant="ghost" onClick={onBack}>← Цамхаг руу буцах</Button>
                </div>
            </div>
        );
    }

    if (status === 'select') {
        const maxN = clearedItems.length;
        return (
            <div className="battle-page battle-result">
                <h2>📚 Сэргээх — тохиргоо</h2>
                <p>{categoryName}</p>
                <p className="tower-pending-note">Нийт {maxN} дийлсэн асуулт боломжтой</p>
                <div className="battle-result-actions review-select-grid">
                    <Button onClick={() => startSession(10)} disabled={maxN < 1}>10 асуулт</Button>
                    <Button onClick={() => startSession(20)} disabled={maxN < 1}>20 асуулт</Button>
                    <Button onClick={() => startSession(maxN)} disabled={maxN < 1}>Бүгд ({maxN})</Button>
                    <Button onClick={() => startSession(maxN, true)} disabled={maxN < 1}>♾️ Эндлесс</Button>
                </div>
                <div className="review-select-custom">
                    <input
                        type="number"
                        min="1"
                        max={maxN}
                        placeholder="Тусгай тоо"
                        value={customCount}
                        onChange={(e) => setCustomCount(e.target.value)}
                    />
                    <Button
                        variant="ghost"
                        disabled={!customCount || Number(customCount) < 1}
                        onClick={() => startSession(Number(customCount))}
                    >
                        Эхлэх
                    </Button>
                </div>
                <div className="battle-result-actions">
                    <Button variant="ghost" onClick={onBack}>← Цамхаг руу буцах</Button>
                </div>
            </div>
        );
    }

    if (status === 'done') {
        return (
            <div className="battle-page battle-result">
                <h2>📚 Сэргээлт дууслаа</h2>
                <p>{categoryName}</p>
                <div className="battle-result-stats">
                    <div className="battle-result-stat">
                        <span className="battle-result-stat-value">{correctCount}</span>
                        <span className="battle-result-stat-label">Зөв</span>
                    </div>
                    <div className="battle-result-stat">
                        <span className="battle-result-stat-value">{wrongCount}</span>
                        <span className="battle-result-stat-label">Буруу</span>
                    </div>
                </div>
                <div className="battle-result-actions">
                    <Button onClick={() => setStatus('select')}>🔁 Дахин тохируулж эхлэх</Button>
                    <Button variant="ghost" onClick={onBack}>← Цамхаг руу буцах</Button>
                </div>
            </div>
        );
    }

    const currentQ = queue[index];
    if (!currentQ) return null;

    return (
        <div className="battle-page">
            <p className="battle-progress">
                📚 Сэргээлт — {isEndless ? `${index + 1} / ♾️` : `${index + 1} / ${queue.length}`}
            </p>
            {isEndless && (
                <Button variant="ghost" onClick={handleStop} className="review-stop-btn">
                    ⏹ Зогсоох
                </Button>
            )}

            <div className="battle-question">
                {currentQ.question_image_url ? (
                    <img src={currentQ.question_image_url} alt="Асуулт" />
                ) : (
                    <h2>{currentQ.quiz_question}</h2>
                )}
            </div>

            <div className="battle-options">
                {options.map((opt, i) => {
                    let stateClass = '';
                    if (isAnswered) {
                        if (opt.isCorrect) stateClass = 'correct';
                        else if (selectedChoice === opt) stateClass = 'wrong';
                    }
                    return (
                        <button
                            key={i}
                            className={`battle-option ${stateClass}`}
                            onClick={() => handleSelect(opt)}
                            disabled={isAnswered}
                        >
                            {opt.img ? <img src={opt.img} alt="Хариулт" /> : opt.text}
                        </button>
                    );
                })}
            </div>

            {isAnswered && (
                <div className="battle-next">
                    <Button onClick={handleNext}>
                        {index + 1 >= queue.length ? 'Дуусгах →' : 'Дараагийн асуулт →'}
                    </Button>
                </div>
            )}
        </div>
    );
}

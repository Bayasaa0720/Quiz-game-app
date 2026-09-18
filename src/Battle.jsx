import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient.jsx';
import Button from './components/Button.jsx';
import { playCorrectHit, playWrongHit, playVictory, playDefeat } from './sound.js';
import ErrorState from './components/ErrorState.jsx';
import PlayerCharacter from './components/PlayerCharacter.jsx';
import EnemyCharacter from './components/EnemyCharacter.jsx';
import { clampDamage, enemyVariant } from './lib/towerLogic.js';
import { shuffle } from './lib/arrayUtils.js';
import { generateRuleBasedDecoys } from './lib/decoyGenerators.js';
import './Battle.css';

const PLAYER_START_HP = 3;
const DAMAGE_TO_ENEMY = 10;
const DAMAGE_TO_PLAYER = 1;
// Matches (frames / fps) of the attack/hurt sheets in PlayerCharacter/EnemyCharacter, plus a small buffer.
const ANIM_RETURN_TO_IDLE_MS = { attack: 450, hurt: 360 };

export default function Battle({ user, categoryId, floor, onFloorCleared, onLeaveTower, onHpChange }) {
    const [questions, setQuestions] = useState([]);
    const [answerPool, setAnswerPool] = useState([]);
    // Front of the queue is the current question. A correct answer removes
    // it for good; a wrong answer sends it to the back so it comes up again
    // later — a question already answered correctly must never reappear in
    // the same battle.
    const [queue, setQueue] = useState([]);
    const [options, setOptions] = useState([]);
    const [selectedChoice, setSelectedChoice] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [playerHP, setPlayerHP] = useState(PLAYER_START_HP);
    const [enemyHP, setEnemyHP] = useState(floor.enemy_hp);
    const [status, setStatus] = useState('loading'); // loading | fighting | won | lost
    const [saving, setSaving] = useState(false);
    const [playerAnim, setPlayerAnim] = useState('idle');
    const [enemyAnim, setEnemyAnim] = useState('idle');
    const [playerTick, setPlayerTick] = useState(0);
    const [enemyTick, setEnemyTick] = useState(0);
    const resultSoundPlayed = useRef(false);
    const playerAnimTimeout = useRef(null);
    const enemyAnimTimeout = useRef(null);
    const variant = enemyVariant(floor.floor_index);

    useEffect(() => {
        return () => {
            clearTimeout(playerAnimTimeout.current);
            clearTimeout(enemyAnimTimeout.current);
        };
    }, []);

    const generateOptions = useCallback((currentQ, pool) => {
        const correct = { text: currentQ.correct_answer, img: currentQ.answer_image_url, isCorrect: true };
        const displayValue = (q) => q.answer_image_url || q.correct_answer;
        const isImage = (q) => !!q.answer_image_url;
        const others = pool.filter(q => q.id !== currentQ.id);
        // Хариултын "төрөл" (зурган/текст) хэзээ ч холилдохгүй байх ёстой тул зөвхөн ижил
        // төрлийн (зурган бол ижил answer_type, эсвэл текст) асуултуудаас л декой сонгоно.
        const kindPool = others.filter(q => isImage(q) === isImage(currentQ));
        // answer_type байхгүй (null) асуултуудыг ч гэсэн тусдаа "төрөл" гэж үзнэ —
        // ингэснээр жишээ нь он (жил) хариулттай асуулт нэрийн хариулттай асуулттай холилдохгүй.
        const sameType = kindPool.filter(q => (q.answer_type || null) === (currentQ.answer_type || null));
        const rest = kindPool.filter(q => !sameType.includes(q));
        const candidates = [...shuffle(sameType), ...shuffle(rest)];

        const seenValues = new Set([displayValue(currentQ)]);
        const wrongs = [];
        for (const q of candidates) {
            if (wrongs.length >= 3) break;
            const value = displayValue(q);
            if (seenValues.has(value)) continue;
            seenValues.add(value);
            wrongs.push({ text: q.correct_answer, img: q.answer_image_url, isCorrect: false });
        }

        // Category pool too thin to fill all 3 slots — top up with offline,
        // zero-cost rule-based decoys (static per-answer_type option pools /
        // nearby-number templates; see lib/decoyGenerators.js). Only for
        // text answers — there's no sensible way to template a fake image.
        if (wrongs.length < 3 && !isImage(currentQ)) {
            const needed = 3 - wrongs.length;
            const ruleBased = generateRuleBasedDecoys(currentQ.answer_type, currentQ.correct_answer, needed + 2);
            for (const text of ruleBased) {
                if (wrongs.length >= 3) break;
                if (seenValues.has(text)) continue;
                seenValues.add(text);
                wrongs.push({ text, img: null, isCorrect: false });
            }
        }

        setOptions(shuffle([correct, ...wrongs]));
    }, []);

    const loadFloor = useCallback(async () => {
        setStatus('loading');
        const [{ data, error }, { data: poolData, error: poolError }] = await Promise.all([
            supabase.from('quiz_items').select('*').in('id', floor.question_ids),
            // Декой сонголтыг зөвхөн энэ давхрын 5 асуултаас биш, тухайн ангиллын БҮХ
            // асуултаас авахын тулд тусад нь татна — ингэснээр ижил төрлийн (зурган/текст)
            // хариулт олдох магадлал өснө.
            supabase.from('quiz_items').select('*').eq('category_id', categoryId),
        ]);
        if (error || poolError) {
            console.error('Error loading battle questions:', error || poolError);
            setStatus('error');
            return;
        }
        setQuestions(data || []);
        setAnswerPool(poolData || []);
        setQueue(shuffle((data || []).map(q => q.id)));
        setPlayerHP(PLAYER_START_HP);
        setEnemyHP(floor.enemy_hp);
        resultSoundPlayed.current = false;
        setStatus('fighting');
    }, [floor, categoryId]);

    useEffect(() => {
        loadFloor();
    }, [loadFloor]);

    useEffect(() => {
        if (status !== 'fighting' || questions.length === 0 || queue.length === 0) return;
        const currentQ = questions.find(q => q.id === queue[0]);
        if (currentQ) {
            generateOptions(currentQ, answerPool);
            setSelectedChoice(null);
            setIsAnswered(false);
        }
    }, [status, questions, queue, answerPool, generateOptions]);

    useEffect(() => {
        onHpChange?.({
            playerHP,
            playerMaxHP: PLAYER_START_HP,
            enemyHP: Math.max(enemyHP, 0),
            enemyMaxHP: floor.enemy_hp,
            playerAnim,
            enemyAnim,
            playerTick,
            enemyTick,
            enemyVariant: variant,
        });
    }, [playerHP, enemyHP, floor.enemy_hp, onHpChange, playerAnim, enemyAnim, playerTick, enemyTick, variant]);

    useEffect(() => {
        if (resultSoundPlayed.current) return;
        if (status === 'won') {
            resultSoundPlayed.current = true;
            playVictory();
        } else if (status === 'lost') {
            resultSoundPlayed.current = true;
            playDefeat();
        }
    }, [status]);

    const handleSelect = (choice) => {
        if (isAnswered) return;
        setSelectedChoice(choice);
        setIsAnswered(true);
        if (choice.isCorrect) {
            playCorrectHit();
            setPlayerAnim('attack');
            setPlayerTick(t => t + 1);
            setEnemyAnim('hurt');
            setEnemyTick(t => t + 1);
            setEnemyHP(hp => clampDamage(hp, DAMAGE_TO_ENEMY));
            clearTimeout(playerAnimTimeout.current);
            playerAnimTimeout.current = setTimeout(() => setPlayerAnim('idle'), ANIM_RETURN_TO_IDLE_MS.attack);
            clearTimeout(enemyAnimTimeout.current);
            enemyAnimTimeout.current = setTimeout(() => setEnemyAnim('idle'), ANIM_RETURN_TO_IDLE_MS.hurt);
        } else {
            playWrongHit();
            setEnemyAnim('attack');
            setEnemyTick(t => t + 1);
            setPlayerAnim('hurt');
            setPlayerTick(t => t + 1);
            setPlayerHP(hp => clampDamage(hp, DAMAGE_TO_PLAYER));
            clearTimeout(enemyAnimTimeout.current);
            enemyAnimTimeout.current = setTimeout(() => setEnemyAnim('idle'), ANIM_RETURN_TO_IDLE_MS.attack);
            clearTimeout(playerAnimTimeout.current);
            playerAnimTimeout.current = setTimeout(() => setPlayerAnim('idle'), ANIM_RETURN_TO_IDLE_MS.hurt);
        }
    };

    const handleNext = async () => {
        if (enemyHP <= 0) {
            setSaving(true);
            try {
                await supabase.from('tower_progress').upsert(
                    {
                        user_id: user.id,
                        category_id: categoryId,
                        highest_cleared_floor: floor.floor_index,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id,category_id' }
                );
            } catch (err) {
                console.error('Error saving tower progress:', err);
            } finally {
                setSaving(false);
            }
            setStatus('won');
            return;
        }
        if (playerHP <= 0) {
            setStatus('lost');
            return;
        }
        setQueue(q => {
            const [current, ...rest] = q;
            const next = selectedChoice?.isCorrect ? rest : [...rest, current];
            if (next.length === 0) {
                // Safety net only: every question has now been answered
                // correctly at least once but the enemy still has HP left
                // (enemy_hp doesn't evenly divide by DAMAGE_TO_ENEMY for
                // this floor's question count) — reshuffle the full set
                // again rather than soft-locking the battle.
                return shuffle(questions.map(qq => qq.id));
            }
            return next;
        });
    };

    if (status === 'loading') return <p style={{ textAlign: 'center' }}>Тулаан бэлдэж байна...</p>;

    if (status === 'error') {
        return <ErrorState message="Тулааныг ачаалахад алдаа гарлаа." onRetry={loadFloor} />;
    }

    if (status === 'won') {
        return (
            <div className="battle-page battle-result">
                <div className="battle-result-characters">
                    <PlayerCharacter anim="victory" size={100} />
                    <EnemyCharacter anim="defeat" size={100} variant={variant} />
                </div>
                <h2>🏆 Дайснийг ялав!</h2>
                <p>Давхар {floor.floor_index + 1} дийлдлээ.</p>
                <Button onClick={onFloorCleared} disabled={saving}>Цамхаг руу буцах</Button>
            </div>
        );
    }

    if (status === 'lost') {
        return (
            <div className="battle-page battle-result">
                <div className="battle-result-characters">
                    <PlayerCharacter anim="defeat" size={100} />
                    <EnemyCharacter anim="victory" size={100} variant={variant} />
                </div>
                <h2>💀 Ялагдлаа...</h2>
                <p>Дахин бэлдээд оролдоорой!</p>
                <div className="battle-result-actions">
                    <Button onClick={loadFloor}>🔁 Дахин оролдох</Button>
                    <Button variant="ghost" onClick={onLeaveTower}>← Цамхаг сонгох руу буцах</Button>
                </div>
            </div>
        );
    }

    const currentQ = questions.find(q => q.id === queue[0]);
    if (!currentQ) return null;

    const isFinalAction = isAnswered && (enemyHP <= 0 || playerHP <= 0);

    return (
        <div className="battle-page">
            <p className="battle-progress">Давхар {floor.floor_index + 1} — Дайсны HP: {Math.max(enemyHP, 0)} / {floor.enemy_hp}</p>

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
                        if (opt.isCorrect) {
                            stateClass = 'correct';
                        } else if (selectedChoice === opt) {
                            stateClass = 'wrong';
                        }
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
                        {isFinalAction ? 'Үзэх →' : 'Дараагийн асуулт →'}
                    </Button>
                </div>
            )}
        </div>
    );
}

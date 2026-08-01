import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient.jsx';
import Button from './components/Button.jsx';
import { playCorrectHit, playWrongHit, playVictory, playDefeat } from './sound.js';
import ErrorState from './components/ErrorState.jsx';
import PlayerCharacter from './components/PlayerCharacter.jsx';
import EnemyCharacter from './components/EnemyCharacter.jsx';
import { clampDamage, enemyVariant } from './lib/towerLogic.js';
import { shuffle } from './lib/arrayUtils.js';
import './Battle.css';

const PLAYER_START_HP = 3;
const DAMAGE_TO_ENEMY = 10;
const DAMAGE_TO_PLAYER = 1;

export default function Battle({ user, categoryId, floor, onFloorCleared, onDefeated, onHpChange }) {
    const [questions, setQuestions] = useState([]);
    const [order, setOrder] = useState([]);
    const [currentPos, setCurrentPos] = useState(0);
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
    const variant = enemyVariant(floor.floor_index);

    const generateOptions = useCallback((currentQ, pool) => {
        const correct = { text: currentQ.correct_answer, img: currentQ.answer_image_url, isCorrect: true };
        const wrongs = shuffle(pool.filter(q => q.id !== currentQ.id))
            .slice(0, 3)
            .map(q => ({ text: q.correct_answer, img: q.answer_image_url, isCorrect: false }));
        setOptions(shuffle([correct, ...wrongs]));
    }, []);

    const loadFloor = useCallback(async () => {
        setStatus('loading');
        const { data, error } = await supabase
            .from('quiz_items')
            .select('*')
            .in('id', floor.question_ids);
        if (error) {
            console.error('Error loading battle questions:', error);
            setStatus('error');
            return;
        }
        setQuestions(data || []);
        setOrder(shuffle((data || []).map(q => q.id)));
        setCurrentPos(0);
        setPlayerHP(PLAYER_START_HP);
        setEnemyHP(floor.enemy_hp);
        resultSoundPlayed.current = false;
        setStatus('fighting');
    }, [floor]);

    useEffect(() => {
        loadFloor();
    }, [loadFloor]);

    useEffect(() => {
        if (status !== 'fighting' || questions.length === 0 || order.length === 0) return;
        const currentQ = questions.find(q => q.id === order[currentPos]);
        if (currentQ) {
            generateOptions(currentQ, questions);
            setSelectedChoice(null);
            setIsAnswered(false);
        }
    }, [status, questions, order, currentPos, generateOptions]);

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
        } else {
            playWrongHit();
            setEnemyAnim('attack');
            setEnemyTick(t => t + 1);
            setPlayerAnim('hurt');
            setPlayerTick(t => t + 1);
            setPlayerHP(hp => clampDamage(hp, DAMAGE_TO_PLAYER));
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
        setCurrentPos(pos => {
            const next = pos + 1;
            if (next >= order.length) {
                setOrder(shuffle(order));
                return 0;
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
                <Button variant="danger" onClick={onDefeated}>Цамхаг сонгох руу буцах</Button>
            </div>
        );
    }

    const currentQ = questions.find(q => q.id === order[currentPos]);
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

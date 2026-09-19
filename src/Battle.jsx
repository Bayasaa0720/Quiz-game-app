import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient.jsx';
import Button from './components/Button.jsx';
import { playCorrectHit, playWrongHit, playVictory, playDefeat } from './sound.js';
import ErrorState from './components/ErrorState.jsx';
import PlayerCharacter from './components/PlayerCharacter.jsx';
import EnemyCharacter from './components/EnemyCharacter.jsx';
import { clampDamage, enemyVariant } from './lib/towerLogic.js';
import { shuffle } from './lib/arrayUtils.js';
import { buildOptions } from './lib/generateOptions.js';
import { awardAchievement } from './lib/achievements.js';
import { useToast } from './components/toastContext.js';
import './Battle.css';

const PLAYER_START_HP = 3;
const DAMAGE_TO_ENEMY = 10;
const DAMAGE_TO_PLAYER = 1;
// Matches (frames / fps) of the attack/hurt sheets in PlayerCharacter/EnemyCharacter, plus a small buffer.
const ANIM_RETURN_TO_IDLE_MS = { attack: 450, hurt: 360 };

export default function Battle({ user, categoryId, floor, onFloorCleared, onGoToFloor, onLeaveTower, onHpChange }) {
    const [questions, setQuestions] = useState([]);
    const [nextFloor, setNextFloor] = useState(null);
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
    const [armorHP, setArmorHP] = useState(0);
    const [armorMax, setArmorMax] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
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
    const { showToast } = useToast();

    useEffect(() => {
        return () => {
            clearTimeout(playerAnimTimeout.current);
            clearTimeout(enemyAnimTimeout.current);
        };
    }, []);

    const generateOptions = useCallback((currentQ, pool) => {
        setOptions(buildOptions(currentQ, pool));
    }, []);

    const loadFloor = useCallback(async () => {
        setStatus('loading');
        const [{ data, error }, { data: poolData, error: poolError }, { data: armorRows }] = await Promise.all([
            supabase.from('quiz_items').select('*').in('id', floor.question_ids),
            // Декой сонголтыг зөвхөн энэ давхрын 5 асуултаас биш, тухайн ангиллын БҮХ
            // асуултаас авахын тулд тусад нь татна — ингэснээр ижил төрлийн (зурган/текст)
            // хариулт олдох магадлал өснө.
            supabase.from('quiz_items').select('*').eq('category_id', categoryId),
            // Идэвхжүүлсэн армор (economy.sql) — байхгүй бол хоосон массив буцна.
            supabase.rpc('get_my_equipped_armor'),
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
        const equippedArmor = armorRows?.[0]?.armor_points || 0;
        setArmorHP(equippedArmor);
        setArmorMax(equippedArmor);
        setCorrectCount(0);
        setWrongCount(0);
        setNextFloor(null);
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
            armorHP,
            armorMax,
            enemyHP: Math.max(enemyHP, 0),
            enemyMaxHP: floor.enemy_hp,
            playerAnim,
            enemyAnim,
            playerTick,
            enemyTick,
            enemyVariant: variant,
        });
    }, [playerHP, armorHP, armorMax, enemyHP, floor.enemy_hp, onHpChange, playerAnim, enemyAnim, playerTick, enemyTick, variant]);

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
            setCorrectCount(c => c + 1);
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
            setWrongCount(c => c + 1);
            playWrongHit();
            setEnemyAnim('attack');
            setEnemyTick(t => t + 1);
            setPlayerAnim('hurt');
            setPlayerTick(t => t + 1);
            // Армор эхэлж шингээнэ (dagt HP хасагдахгүй), армор дуусаад л HP хасагдана.
            setArmorHP(hp => {
                if (hp > 0) return hp - 1;
                setPlayerHP(playerHp => clampDamage(playerHp, DAMAGE_TO_PLAYER));
                return hp;
            });
            clearTimeout(enemyAnimTimeout.current);
            enemyAnimTimeout.current = setTimeout(() => setEnemyAnim('idle'), ANIM_RETURN_TO_IDLE_MS.attack);
            clearTimeout(playerAnimTimeout.current);
            playerAnimTimeout.current = setTimeout(() => setPlayerAnim('idle'), ANIM_RETURN_TO_IDLE_MS.hurt);
        }
    };

    const handleNext = async () => {
        if (enemyHP <= 0) {
            setSaving(true);
            // battle_attempts_log эрх (RLS) хараахан тохируулаагүй бол алдаа
            // гарч болно — багшийн dashboard-д зориулсан статистик тул чимээгүй
            // алгасна (тулааны үр дүнд нөлөөлөхгүй).
            supabase.from('battle_attempts_log').insert({
                user_id: user.id,
                category_id: categoryId,
                floor_index: floor.floor_index,
                outcome: 'won',
                correct_count: correctCount,
                wrong_count: wrongCount,
            }).then(({ error }) => { if (error) console.warn('battle_attempts_log insert skipped:', error.message); });

            const flawless = wrongCount === 0;
            try {
                // record_floor_win нь сервер талд tower_progress-ийг өөрөө бичдэг
                // (анх удаа дийлсэн бол л оноо олгож, дахин давахад farm хийхээс
                // сэргийлдэг) — client шууд tower_progress бичихээ больсон.
                const [{ data: next }, { data: pointsAwarded }] = await Promise.all([
                    supabase.from('tower_floors')
                        .select('id, floor_index, difficulty, question_ids, enemy_hp')
                        .eq('category_id', categoryId)
                        .eq('floor_index', floor.floor_index + 1)
                        .maybeSingle(),
                    supabase.rpc('record_floor_win', {
                        p_category_id: categoryId,
                        p_floor_index: floor.floor_index,
                        p_flawless: flawless,
                    }),
                ]);
                setNextFloor(next || null);
                if (pointsAwarded > 0) {
                    showToast({ icon: '💰', title: `+${pointsAwarded} оноо`, message: flawless ? 'Цэвэр ялалтын бонустой!' : undefined });
                }

                // Achievement-ууд — upsert(ignoreDuplicates) тул давхар дуудахад аюулгүй.
                awardAchievement(supabase, user.id, 'first_floor').then(isNew => {
                    if (isNew) showToast({ icon: '🏹', title: 'Шинэ achievement!', message: 'Анхны алхам' });
                });
                if (flawless) {
                    awardAchievement(supabase, user.id, 'flawless_floor').then(isNew => {
                        if (isNew) showToast({ icon: '💯', title: 'Шинэ achievement!', message: 'Цэвэр ялалт' });
                    });
                }
                if (!next) {
                    awardAchievement(supabase, user.id, 'tower_complete').then(isNew => {
                        if (isNew) showToast({ icon: '🗼', title: 'Шинэ achievement!', message: 'Цамхаг эзэн' });
                    });
                }
            } catch (err) {
                console.error('Error saving floor win:', err);
                setNextFloor(null);
            } finally {
                setSaving(false);
            }
            setStatus('won');
            return;
        }
        if (playerHP <= 0) {
            supabase.from('battle_attempts_log').insert({
                user_id: user.id,
                category_id: categoryId,
                floor_index: floor.floor_index,
                outcome: 'lost',
                correct_count: correctCount,
                wrong_count: wrongCount,
            }).then(({ error }) => { if (error) console.warn('battle_attempts_log insert skipped:', error.message); });
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
                <div className="battle-result-actions">
                    {nextFloor && (
                        <Button onClick={() => onGoToFloor(nextFloor)} disabled={saving}>
                            ⚔️ Давхар {nextFloor.floor_index + 1} руу
                        </Button>
                    )}
                    <Button variant={nextFloor ? 'ghost' : 'primary'} onClick={onFloorCleared} disabled={saving}>
                        Цамхаг руу буцах
                    </Button>
                </div>
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

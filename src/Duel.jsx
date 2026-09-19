import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { buildOptions } from './lib/generateOptions.js';
import { awardAchievement } from './lib/achievements.js';
import { useToast } from './components/toastContext.js';
import { playCorrectHit, playWrongHit, playVictory, playDefeat } from './sound.js';
import './Duel.css';

const POLL_MS = 2500;
const TIMEOUT_MS = 60000;

export default function Duel({ user, categoryId, categoryName, matchId: initialMatchId, isChallengeAccept, onBack }) {
    const [matchId, setMatchId] = useState(null);
    const [match, setMatch] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [pool, setPool] = useState([]);
    const [options, setOptions] = useState([]);
    const [currentQId, setCurrentQId] = useState(null);
    const [selectedChoice, setSelectedChoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const achievementAwarded = useRef(false);
    const resultSoundPlayed = useRef(false);
    const { showToast } = useToast();

    const fetchMatch = useCallback(async (id) => {
        const { data, error } = await supabase.rpc('duel_get_match', { p_match_id: id });
        if (!error && data?.[0]) setMatch(data[0]);
    }, []);

    const loadQuestionsFor = useCallback(async (questionIds) => {
        const [{ data: qData }, { data: poolData }] = await Promise.all([
            supabase.from('quiz_items').select('*').in('id', questionIds),
            supabase.from('quiz_items').select('*').eq('category_id', categoryId),
        ]);
        setQuestions(qData || []);
        setPool(poolData || []);
    }, [categoryId]);

    // Нээлттэй queue-гоор шинэ өрсөлдөгч хайна (эхний ачаалалт, эсвэл "Дахин тоглох").
    const searchPublicMatch = useCallback(async () => {
        setLoading(true);
        setErrorMsg('');
        setMatch(null);
        setMatchId(null);
        setCurrentQId(null);
        setSelectedChoice(null);
        achievementAwarded.current = false;
        resultSoundPlayed.current = false;

        const { data: newMatchId, error: findErr } = await supabase.rpc('duel_find_match', { p_category_id: categoryId });
        if (findErr) {
            setErrorMsg(findErr.message || 'Тоглолт эхлүүлэхэд алдаа гарлаа.');
            setLoading(false);
            return;
        }
        setMatchId(newMatchId);

        const { data: matchRows } = await supabase.rpc('duel_get_match', { p_match_id: newMatchId });
        const initialMatch = matchRows?.[0];
        if (!initialMatch) {
            setErrorMsg('Тоглолтыг ачаалахад алдаа гарлаа.');
            setLoading(false);
            return;
        }
        setMatch(initialMatch);
        await loadQuestionsFor(initialMatch.question_ids);
        setLoading(false);
    }, [categoryId, loadQuestionsFor]);

    // Эхний ачаалалт: challenge хүлээж авах эсвэл найзын үүсгэсэн challenge-ийн
    // хүлээх дэлгэц рүү орох, эсрэг тохиолдолд нээлттэй queue хайна.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (initialMatchId) {
                if (isChallengeAccept) {
                    const { error } = await supabase.rpc('duel_accept_challenge', { p_match_id: initialMatchId });
                    if (cancelled) return;
                    if (error) {
                        setErrorMsg(error.message || 'Урилгыг хүлээн авахад алдаа гарлаа.');
                        setLoading(false);
                        return;
                    }
                }
                setMatchId(initialMatchId);
                const { data: matchRows, error: getErr } = await supabase.rpc('duel_get_match', { p_match_id: initialMatchId });
                if (cancelled) return;
                const initialMatch = matchRows?.[0];
                if (getErr || !initialMatch) {
                    setErrorMsg('Тоглолтыг ачаалахад алдаа гарлаа.');
                    setLoading(false);
                    return;
                }
                setMatch(initialMatch);
                await loadQuestionsFor(initialMatch.question_ids);
                if (!cancelled) setLoading(false);
                return;
            }
            await searchPublicMatch();
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Realtime (best-effort) + polling fallback — өрсөлдөгч хайх/хариулах бүрийг мэдэрнэ.
    useEffect(() => {
        if (!matchId) return;

        const channel = supabase
            .channel(`duel-${matchId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${matchId}` }, () => {
                fetchMatch(matchId);
            })
            .subscribe();

        const interval = setInterval(() => {
            if (match?.status !== 'finished') fetchMatch(matchId);
        }, POLL_MS);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchId, fetchMatch]);

    // Асуулт солигдоход (шинэ round) сонголтуудыг дахин үүсгэнэ.
    useEffect(() => {
        if (!match || match.status !== 'active' || questions.length === 0) return;
        const qId = match.question_ids[match.current_index];
        if (qId === currentQId) return;
        const q = questions.find(item => item.id === qId);
        if (!q) return;
        setCurrentQId(qId);
        setSelectedChoice(null);
        setOptions(buildOptions(q, pool));
    }, [match, questions, pool, currentQId]);

    useEffect(() => {
        if (match?.status === 'finished' && match.winner_id === user.id && !achievementAwarded.current) {
            achievementAwarded.current = true;
            awardAchievement(supabase, user.id, 'duel_first_win').then(isNew => {
                if (isNew) showToast({ icon: '⚔️', title: 'Шинэ achievement!', message: 'Дуэлийн ялагч' });
            });
        }
    }, [match, user.id, showToast]);

    const myRole = match && user.id === match.player1_id ? 'player1' : 'player2';
    const oppRole = myRole === 'player1' ? 'player2' : 'player1';
    const myScore = match?.[`${myRole}_score`] ?? 0;
    const oppScore = match?.[`${oppRole}_score`] ?? 0;
    const myAnswered = match?.[`${myRole}_round_answered`] ?? false;
    const oppAnswered = match?.[`${oppRole}_round_answered`] ?? false;
    const oppName = match?.[`${oppRole}_name`];

    // Хариу хүлээгдэж буй тал 60 секунд хариулаагүй бол автомат ялалт нэхэмжилнэ.
    useEffect(() => {
        if (!matchId || match?.status !== 'active' || !myAnswered || oppAnswered) return;
        const startedAt = match.round_started_at ? new Date(match.round_started_at).getTime() : Date.now();
        const remaining = Math.max(0, TIMEOUT_MS - (Date.now() - startedAt));
        const timer = setTimeout(() => {
            supabase.rpc('duel_claim_timeout_win', { p_match_id: matchId }).then(() => fetchMatch(matchId));
        }, remaining + 500);
        return () => clearTimeout(timer);
    }, [matchId, match?.status, match?.round_started_at, myAnswered, oppAnswered, fetchMatch]);

    // Ялалт/ялагдал/тэнцлийн дуу — нэг л удаа тоглуулна.
    useEffect(() => {
        if (match?.status !== 'finished' || resultSoundPlayed.current) return;
        resultSoundPlayed.current = true;
        if (match.winner_id === user.id) playVictory();
        else if (match.winner_id !== null) playDefeat();
    }, [match, user.id]);

    const handleCancelSearch = async () => {
        if (matchId) await supabase.rpc('duel_cancel_match', { p_match_id: matchId });
        onBack();
    };

    const handleSelect = async (opt) => {
        if (myAnswered || !matchId || submitting) return;
        setSelectedChoice(opt);
        setSubmitting(true);
        if (opt.isCorrect) playCorrectHit(); else playWrongHit();
        try {
            await supabase.rpc('duel_submit_answer', { p_match_id: matchId, p_is_correct: opt.isCorrect });
            await fetchMatch(matchId);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Тоглолт бэлдэж байна...</p>;
    if (errorMsg) return <ErrorState message={errorMsg} onRetry={onBack} />;
    if (!match) return null;

    if (match.status === 'waiting') {
        return (
            <div className="duel-page duel-searching">
                <div className="duel-spinner" aria-hidden="true" />
                <h2>{match.is_direct_challenge ? 'Найзаа хүлээж байна...' : 'Өрсөлдөгч хайж байна...'}</h2>
                <p>Сэдэв: {categoryName}</p>
                <Button variant="ghost" onClick={handleCancelSearch}>Цуцлах</Button>
            </div>
        );
    }

    if (match.status === 'finished') {
        const result = match.winner_id === null ? 'tie' : (match.winner_id === user.id ? 'win' : 'lose');
        return (
            <div className="duel-page duel-result">
                {result === 'win' && <h2>🏆 Та яллаа!</h2>}
                {result === 'lose' && <h2>💀 Та хожигдлоо</h2>}
                {result === 'tie' && <h2>🤝 Тэнцлээ</h2>}
                <p className="duel-final-score">{myScore} : {oppScore}</p>
                <p>Өрсөлдөгч: {oppName || '—'}</p>
                <div className="duel-result-actions">
                    <Button onClick={searchPublicMatch}>🔁 Дахин тоглох</Button>
                    <Button variant="ghost" onClick={onBack}>← Буцах</Button>
                </div>
            </div>
        );
    }

    const currentQ = questions.find(q => q.id === match.question_ids[match.current_index]);
    if (!currentQ) return <p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>;

    return (
        <div className="duel-page">
            <div className="duel-scoreboard">
                <div className="duel-score-side">
                    <span className="duel-score-name">Та</span>
                    <span className="duel-score-value">{myScore}</span>
                </div>
                <span className="duel-score-vs">VS</span>
                <div className="duel-score-side">
                    <span className="duel-score-name">{oppName || 'Өрсөлдөгч'}</span>
                    <span className="duel-score-value">{oppScore}</span>
                </div>
            </div>
            <p className="duel-progress">Асуулт {match.current_index + 1} / {match.question_ids.length}</p>

            <div className="duel-question">
                {currentQ.question_image_url ? (
                    <img src={currentQ.question_image_url} alt="Асуулт" />
                ) : (
                    <h2>{currentQ.quiz_question}</h2>
                )}
            </div>

            <div className="duel-options">
                {options.map((opt, i) => {
                    let stateClass = '';
                    if (myAnswered && selectedChoice === opt) {
                        stateClass = opt.isCorrect ? 'correct' : 'wrong';
                    }
                    return (
                        <button
                            key={i}
                            className={`duel-option ${stateClass}`}
                            onClick={() => handleSelect(opt)}
                            disabled={myAnswered || submitting}
                        >
                            {opt.img ? <img src={opt.img} alt="Хариулт" /> : opt.text}
                        </button>
                    );
                })}
            </div>

            {myAnswered && (
                <p className="duel-waiting">
                    {oppAnswered ? 'Дараагийн асуулт руу шилжиж байна...' : `${oppName || 'Өрсөлдөгч'}-ийг хүлээж байна... (60 секундэд хариулаагүй бол автомат ялна)`}
                </p>
            )}
        </div>
    );
}

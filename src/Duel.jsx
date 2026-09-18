import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { buildOptions } from './lib/generateOptions.js';
import { awardAchievement } from './lib/achievements.js';
import './Duel.css';

const POLL_MS = 2500;

export default function Duel({ user, categoryId, categoryName, onBack }) {
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

    const fetchMatch = useCallback(async (id) => {
        const { data, error } = await supabase.rpc('duel_get_match', { p_match_id: id });
        if (!error && data?.[0]) setMatch(data[0]);
    }, []);

    // Тоглогч олох + 5 асуулт болон декойд ашиглах ангиллын бүх сан татна.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            const { data: newMatchId, error: findErr } = await supabase.rpc('duel_find_match', { p_category_id: categoryId });
            if (cancelled) return;
            if (findErr) {
                setErrorMsg(findErr.message || 'Тоглолт эхлүүлэхэд алдаа гарлаа.');
                setLoading(false);
                return;
            }
            setMatchId(newMatchId);

            const { data: matchRows } = await supabase.rpc('duel_get_match', { p_match_id: newMatchId });
            const initialMatch = matchRows?.[0];
            if (cancelled || !initialMatch) {
                setErrorMsg('Тоглолтыг ачаалахад алдаа гарлаа.');
                setLoading(false);
                return;
            }
            setMatch(initialMatch);

            const [{ data: qData }, { data: poolData }] = await Promise.all([
                supabase.from('quiz_items').select('*').in('id', initialMatch.question_ids),
                supabase.from('quiz_items').select('*').eq('category_id', categoryId),
            ]);
            if (cancelled) return;
            setQuestions(qData || []);
            setPool(poolData || []);
            setLoading(false);
        })();

        return () => { cancelled = true; };
    }, [categoryId]);

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
            awardAchievement(supabase, user.id, 'duel_first_win');
        }
    }, [match, user.id]);

    const myRole = match && user.id === match.player1_id ? 'player1' : 'player2';
    const oppRole = myRole === 'player1' ? 'player2' : 'player1';
    const myScore = match?.[`${myRole}_score`] ?? 0;
    const oppScore = match?.[`${oppRole}_score`] ?? 0;
    const myAnswered = match?.[`${myRole}_round_answered`] ?? false;
    const oppAnswered = match?.[`${oppRole}_round_answered`] ?? false;
    const oppName = match?.[`${oppRole}_name`];

    const handleCancelSearch = async () => {
        if (matchId) await supabase.rpc('duel_cancel_match', { p_match_id: matchId });
        onBack();
    };

    const handleSelect = async (opt) => {
        if (myAnswered || !matchId || submitting) return;
        setSelectedChoice(opt);
        setSubmitting(true);
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
                <h2>Өрсөлдөгч хайж байна...</h2>
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
                    {oppAnswered ? 'Дараагийн асуулт руу шилжиж байна...' : `${oppName || 'Өрсөлдөгч'}-ийг хүлээж байна...`}
                </p>
            )}
        </div>
    );
}

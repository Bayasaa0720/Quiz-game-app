import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import ErrorState from './components/ErrorState.jsx';
import Button from './components/Button.jsx';
import { clearedCount } from './lib/towerLogic.js';
import './Home.css';

const DAY_MS = 24 * 60 * 60 * 1000;
// 7 хоногт дор хаяж 1 давхар/өдөр — тогтмол зорилго (тохируулах schema
// хараахан алга, тогтмол тоо хэрэглэнэ).
const WEEKLY_GOAL = 7;

// "Тэмдэглэгээ": цоо шинэ (0 дийлсэн) -> Шинэ, эзэмшигч -> Эзэн.
function towerTag(cat, user, cleared) {
    if (cat.is_global) return 'Үндсэн';
    if (cleared === 0) return 'Шинэ';
    if (user && cat.user_id === user.id) return 'Эзэн';
    return null;
}

export default function Home({ user, isGuest, guestProgress, displayName, onSelectTower, onAcceptChallenge, onOpenLeaderboard, onCreateTower }) {
    const [categories, setCategories] = useState([]);
    const [floorCounts, setFloorCounts] = useState({});
    const [progressMap, setProgressMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [towerSearch, setTowerSearch] = useState('');
    const [pendingChallenges, setPendingChallenges] = useState([]);
    const [weeklyWins, setWeeklyWins] = useState([]); // [{ date, count }] сүүлийн 7 хоног
    const [topPlayers, setTopPlayers] = useState([]);

    // Зочинд хувийн өгөгдөл (дуэл, leaderboard, 7 хоногийн ажил) байхгүй —
    // зөвхөн World tower-ын явц л guestProgress prop-оор дамждаг.
    const getCleared = useCallback((catId) => {
        return isGuest ? clearedCount(guestProgress?.[catId] ?? -1) : clearedCount(progressMap[catId]);
    }, [isGuest, guestProgress, progressMap]);

    useEffect(() => {
        if (isGuest) return;
        let cancelled = false;
        supabase.rpc('duel_get_pending_challenges').then(({ data, error }) => {
            if (!cancelled && !error) setPendingChallenges(data || []);
        });
        supabase.rpc('get_leaderboard', { p_category_id: null, p_limit: 4 }).then(({ data, error }) => {
            if (!cancelled && !error) setTopPlayers(data || []);
        });
        const since = new Date(Date.now() - 7 * DAY_MS).toISOString();
        supabase.from('battle_attempts_log').select('played_at')
            .eq('user_id', user.id).eq('outcome', 'won').gte('played_at', since)
            .then(({ data, error }) => {
                if (cancelled || error) return;
                const counts = {};
                (data || []).forEach(r => {
                    const day = r.played_at.slice(0, 10);
                    counts[day] = (counts[day] || 0) + 1;
                });
                const days = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
                    days.push({ date: d, count: counts[d] || 0 });
                }
                setWeeklyWins(days);
            });
        return () => { cancelled = true; };
    }, [isGuest, user?.id]);

    const handleAcceptChallenge = (challenge) => {
        setPendingChallenges(list => list.filter(c => c.match_id !== challenge.match_id));
        onAcceptChallenge(challenge.match_id, challenge.category_id, challenge.category_name);
    };

    const handleDeclineChallenge = async (challenge) => {
        setPendingChallenges(list => list.filter(c => c.match_id !== challenge.match_id));
        await supabase.rpc('duel_decline_challenge', { p_match_id: challenge.match_id });
    };

    const fetchTowers = useCallback(async () => {
        if (!user && !isGuest) return;
        setLoading(true);
        setLoadError(false);
        try {
            // Зочин зөвхөн is_global=true (World tower) ангиллыг л уншиж
            // болно (anon grant, RLS — supabase/guest_mode.sql харна уу).
            let catsQuery = supabase.from('categories').select('id, name, user_id, is_global').order('name', { ascending: true });
            catsQuery = isGuest ? catsQuery.eq('is_global', true) : catsQuery.or(`user_id.eq.${user.id},is_global.eq.true`);
            const { data: cats, error: catErr } = await catsQuery;
            if (catErr) throw catErr;
            setCategories(cats || []);

            const categoryIds = (cats || []).map(c => c.id);
            if (categoryIds.length > 0) {
                const { data: floors, error: floorErr } = await supabase
                    .from('tower_floors')
                    .select('category_id, floor_index')
                    .in('category_id', categoryIds);
                if (floorErr) throw floorErr;
                const counts = {};
                (floors || []).forEach(f => {
                    counts[f.category_id] = Math.max(counts[f.category_id] || 0, f.floor_index + 1);
                });
                setFloorCounts(counts);

                if (isGuest) {
                    setProgressMap({});
                } else {
                    const { data: progress, error: progErr } = await supabase
                        .from('tower_progress')
                        .select('category_id, highest_cleared_floor')
                        .eq('user_id', user.id)
                        .in('category_id', categoryIds);
                    if (progErr) throw progErr;
                    const pMap = {};
                    (progress || []).forEach(p => { pMap[p.category_id] = p.highest_cleared_floor; });
                    setProgressMap(pMap);
                }
            } else {
                setFloorCounts({});
                setProgressMap({});
            }
        } catch (err) {
            console.error('Error loading towers:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [user, isGuest]);

    useEffect(() => {
        fetchTowers();
    }, [fetchTowers]);

    // "Үргэлжлүүлэх" карт — хамгийн саяхан идэвхтэй (эхэлсэн ч дуусаагүй)
    // цамхаг, байхгүй бол анхны тоглоход бэлэн цамхаг.
    const continueCategory = useMemo(() => {
        const ready = categories.filter(c => (floorCounts[c.id] || 0) > 0);
        const inProgress = ready.find(c => {
            const cleared = getCleared(c.id);
            return cleared > 0 && cleared < floorCounts[c.id];
        });
        return inProgress || ready[0] || null;
    }, [categories, floorCounts, getCleared]);

    if (loading) return <p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Мэдээллийг ачаалахад алдаа гарлаа." onRetry={fetchTowers} />;

    const maxWeekly = Math.max(1, ...weeklyWins.map(d => d.count));
    let streak = 0;
    for (let i = weeklyWins.length - 1; i >= 0; i--) {
        if (weeklyWins[i].count > 0) streak++; else break;
    }
    const totalWeekly = weeklyWins.reduce((s, d) => s + d.count, 0);

    const worldTowers = categories.filter(c => c.is_global);
    const myTowers = isGuest ? [] : categories.filter(c => !c.is_global && c.user_id === user.id);
    const filterBySearch = (list) => list.filter(cat => cat.name.toLowerCase().includes(towerSearch.trim().toLowerCase()));

    const renderTowerCard = (cat) => {
        const total = floorCounts[cat.id] || 0;
        const cleared = getCleared(cat.id);
        const ready = total > 0;
        const isDone = ready && cleared >= total;
        const tag = towerTag(cat, user, cleared);
        return (
            <Card
                key={cat.id}
                className={`tower-card${ready ? ' playable' : ' pending'}`}
                onClick={() => ready && onSelectTower(cat.id, cat.name)}
            >
                <div className="tower-card-top">
                    <h3>{cat.name}</h3>
                    {tag && <span className="tower-card-tag">{tag}</span>}
                </div>
                {ready ? (
                    <>
                        <div className="tower-card-progress-row">
                            <ProgressBar value={cleared} max={total} variant="accent" />
                            <span className="tower-card-pct">{Math.round((cleared / total) * 100)}%</span>
                        </div>
                        <span className="tower-card-cta">{isDone ? 'Дахин тоглох →' : `Давхар ${cleared + 1} руу →`}</span>
                    </>
                ) : (
                    <p className="tower-pending-note">Бэлдэгдэж байна…</p>
                )}
            </Card>
        );
    };

    const continueTotal = continueCategory ? (floorCounts[continueCategory.id] || 0) : 0;
    const continueCleared = continueCategory ? getCleared(continueCategory.id) : 0;
    const continueIsDone = continueTotal > 0 && continueCleared >= continueTotal;
    const continueNextFloor = continueTotal > 0 ? Math.min(continueCleared, continueTotal - 1) + 1 : null;

    return (
        <div className="home-page">
            <div className="home-header">
                <h1>Сайн байна уу, {isGuest ? 'Зочин' : (displayName || user?.email)}!</h1>
                <p className="home-header-sub">
                    {totalWeekly > 0
                        ? `Энэ 7 хоногт ${totalWeekly} давхар дийллээ${streak > 0 ? ` · ${streak} хоног дараалан идэвхтэй` : ''}.`
                        : 'Цамхгаа сонгож дэвшил үзье!'}
                </p>
            </div>

            <div className="home-top-grid">
                <div className="home-top-left">
                    {continueCategory ? (
                        <Card className="home-continue-card">
                            <span className="eyebrow-label">{continueIsDone ? 'Дахин тоглох' : 'Үргэлжлүүлэх'}</span>
                            <h2>{continueCategory.name}</h2>
                            <div className="tower-continue-row">
                                {continueTotal > 0 ? (
                                    <ProgressBar value={continueCleared} max={continueTotal} variant="accent" label={<span>{continueCleared}/{continueTotal}</span>} />
                                ) : <span className="tower-pending-note">Бэлдэгдэж байна…</span>}
                                <Button onClick={() => onSelectTower(continueCategory.id, continueCategory.name)}>
                                    {continueIsDone ? 'Дахин тоглох' : `Давхар ${continueNextFloor} руу`}
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <Card className="home-continue-card">
                            <span className="eyebrow-label">Эхлэх</span>
                            <p className="tower-pending-note">Одоогоор тоглох цамхаг алга. Доороос сонгоорой.</p>
                        </Card>
                    )}
                </div>

                {!isGuest && (
                    <div className="home-top-right">
                        <Card className="home-weekly-card">
                            <span className="eyebrow-label">7 хоногийн зорилго</span>
                            <p className="weekly-goal-count">{totalWeekly} / {WEEKLY_GOAL} давхар</p>
                            <div className="weekly-chart">
                                {weeklyWins.map(d => (
                                    <div key={d.date} className="weekly-bar" style={{ height: `${Math.max(6, (d.count / maxWeekly) * 100)}%` }} title={`${d.date}: ${d.count}`} />
                                ))}
                            </div>
                            <p className="weekly-summary">
                                {totalWeekly >= WEEKLY_GOAL
                                    ? '🎉 Энэ 7 хоногийн зорилго биелсэн!'
                                    : `Өнөөдөр ${WEEKLY_GOAL - totalWeekly} давхар дийлбэл зорилго биелнэ`}
                                {streak > 0 ? ` · ${streak} хоног дараалан` : ''}
                            </p>
                        </Card>

                        <Card className="home-leaderboard-card">
                            <div className="home-leaderboard-head">
                                <span className="eyebrow-label">Тэргүүлэгчид</span>
                                <button type="button" className="home-leaderboard-all" onClick={onOpenLeaderboard}>Бүгд →</button>
                            </div>
                            {topPlayers.length === 0 ? (
                                <p className="tower-pending-note">Одоогоор хэн ч давхар дийлээгүй байна.</p>
                            ) : (
                                <ol className="home-leaderboard-list">
                                    {topPlayers.map(p => (
                                        <li key={p.user_id} className={p.user_id === user.id ? 'is-you' : ''}>
                                            <span>#{p.rank} {p.display_name}</span>
                                            <span>{p.total_floors_cleared}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </Card>

                        {pendingChallenges.length > 0 && (
                            <div className="duel-invite-panel">
                                <span className="eyebrow-label">Дуэлийн урилга</span>
                                {pendingChallenges.map(c => (
                                    <div key={c.match_id} className="duel-invite-row">
                                        <span>{c.challenger_name} — {c.category_name}</span>
                                        <div className="duel-invite-actions">
                                            <Button variant="success" onClick={() => handleAcceptChallenge(c)}>Тоглох</Button>
                                            <Button variant="ghost" onClick={() => handleDeclineChallenge(c)}>Татгалзах</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="home-section-head">
                <div>
                    <h2>World tower</h2>
                    <p className="home-section-sub">Бүх хэрэглэгчид нээлттэй · Админ удирдана</p>
                </div>
                {categories.length > 3 && (
                    <input
                        type="text"
                        className="tower-search"
                        placeholder="🔍 Цамхаг хайх..."
                        value={towerSearch}
                        onChange={(e) => setTowerSearch(e.target.value)}
                    />
                )}
            </div>
            <div className="tower-grid">
                {worldTowers.length === 0 && <p className="tower-empty">Одоогоор World tower алга.</p>}
                {filterBySearch(worldTowers).map(renderTowerCard)}
            </div>

            {!isGuest && (
                <>
                    <div className="home-section-head">
                        <div>
                            <h2>Миний цамхагууд</h2>
                            <p className="home-section-sub">Private · зөвхөн танд харагдана</p>
                        </div>
                    </div>
                    <div className="tower-grid">
                        {filterBySearch(myTowers).map(renderTowerCard)}
                        <Card className="tower-card home-create-card" onClick={onCreateTower}>
                            <span className="home-create-icon">➕</span>
                            <span>Шинэ цамхаг</span>
                            <span className="tower-pending-note">Өөрийн асуулттаар цамхаг бүтээх</span>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}

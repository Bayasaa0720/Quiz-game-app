import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import ErrorState from './components/ErrorState.jsx';
import Button from './components/Button.jsx';
import { clearedCount, DIFFICULTY_LABELS } from './lib/towerLogic.js';
import './TowerSelect.css';

const PLAYER_START_HP = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// "Тэмдэглэгээ": is_global -> Үндсэн, цоо шинэ (0 дийлсэн) -> Шинэ, эзэмшигч -> Эзэн.
function towerTag(cat, user, cleared) {
    if (cat.is_global) return 'Үндсэн';
    if (cleared === 0) return 'Шинэ';
    if (cat.user_id === user.id) return 'Эзэн';
    return null;
}

export default function TowerSelect({ user, onSelectTower, onAcceptChallenge }) {
    const [categories, setCategories] = useState([]);
    const [floorCounts, setFloorCounts] = useState({});
    const [progressMap, setProgressMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [towerSearch, setTowerSearch] = useState('');
    const [pendingChallenges, setPendingChallenges] = useState([]);
    const [overviewCategoryId, setOverviewCategoryId] = useState(null);
    const [overviewFloorMeta, setOverviewFloorMeta] = useState(null);
    const [equippedArmor, setEquippedArmor] = useState(null);
    const [weeklyWins, setWeeklyWins] = useState([]); // [{ date, count }] сүүлийн 7 хоног

    useEffect(() => {
        supabase.rpc('duel_get_pending_challenges').then(({ data, error }) => {
            if (!error) setPendingChallenges(data || []);
        });
        supabase.rpc('get_my_equipped_armor').then(({ data, error }) => {
            if (!error) setEquippedArmor(data?.[0] || null);
        });
        const since = new Date(Date.now() - 7 * DAY_MS).toISOString();
        supabase.from('battle_attempts_log').select('created_at')
            .eq('user_id', user.id).eq('outcome', 'won').gte('created_at', since)
            .then(({ data, error }) => {
                if (error) return;
                const counts = {};
                (data || []).forEach(r => {
                    const day = r.created_at.slice(0, 10);
                    counts[day] = (counts[day] || 0) + 1;
                });
                const days = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
                    days.push({ date: d, count: counts[d] || 0 });
                }
                setWeeklyWins(days);
            });
    }, [user.id]);

    const handleAcceptChallenge = (challenge) => {
        setPendingChallenges(list => list.filter(c => c.match_id !== challenge.match_id));
        onAcceptChallenge(challenge.match_id, challenge.category_id, challenge.category_name);
    };

    const handleDeclineChallenge = async (challenge) => {
        setPendingChallenges(list => list.filter(c => c.match_id !== challenge.match_id));
        await supabase.rpc('duel_decline_challenge', { p_match_id: challenge.match_id });
    };

    const fetchTowers = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setLoadError(false);
        try {
            const { data: cats, error: catErr } = await supabase
                .from('categories')
                .select('id, name, user_id, is_global')
                .or(`user_id.eq.${user.id},is_global.eq.true`)
                .order('name', { ascending: true });
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

                const { data: progress, error: progErr } = await supabase
                    .from('tower_progress')
                    .select('category_id, highest_cleared_floor')
                    .eq('user_id', user.id)
                    .in('category_id', categoryIds);
                if (progErr) throw progErr;
                const pMap = {};
                (progress || []).forEach(p => { pMap[p.category_id] = p.highest_cleared_floor; });
                setProgressMap(pMap);
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
    }, [user]);

    useEffect(() => {
        fetchTowers();
    }, [fetchTowers]);

    const overviewCategory = useMemo(
        () => categories.find(c => c.id === overviewCategoryId) || null,
        [categories, overviewCategoryId]
    );

    // "Үргэлжлүүлэх" карт дээрх давхрын нэр/хэцүүчлэл/дайсны HP-г тухайн
    // цамхаг сонгогдох бүрд нь тусад нь татна (жагсаалтын query-д оруулаагүй).
    useEffect(() => {
        if (!overviewCategory) {
            setOverviewFloorMeta(null);
            return;
        }
        const total = floorCounts[overviewCategory.id] || 0;
        if (total === 0) return;
        const cleared = clearedCount(progressMap[overviewCategory.id]);
        const nextIndex = Math.min(cleared, total - 1);
        let cancelled = false;
        supabase.from('tower_floors').select('difficulty, enemy_hp')
            .eq('category_id', overviewCategory.id).eq('floor_index', nextIndex).maybeSingle()
            .then(({ data }) => { if (!cancelled) setOverviewFloorMeta(data || null); });
        return () => { cancelled = true; };
    }, [overviewCategory, floorCounts, progressMap]);

    const openOverview = (catId) => setOverviewCategoryId(catId);
    const closeOverview = () => setOverviewCategoryId(null);

    if (loading) return <p style={{ textAlign: 'center' }}>Таны цамхгуудыг ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Цамхгуудыг ачаалахад алдаа гарлаа." onRetry={fetchTowers} />;

    const duelInvitePanel = pendingChallenges.length > 0 && (
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
    );

    // --- "Үргэлжлүүлэх" тойм дэлгэц (сонгосон цамхаг) ---
    if (overviewCategory) {
        const total = floorCounts[overviewCategory.id] || 0;
        const cleared = clearedCount(progressMap[overviewCategory.id]);
        const isDone = total > 0 && cleared >= total;
        const nextFloorLabel = total > 0 ? Math.min(cleared, total - 1) + 1 : null;
        const maxWeekly = Math.max(1, ...weeklyWins.map(d => d.count));
        let streak = 0;
        for (let i = weeklyWins.length - 1; i >= 0; i--) {
            if (weeklyWins[i].count > 0) streak++; else break;
        }
        const totalWeekly = weeklyWins.reduce((s, d) => s + d.count, 0);

        return (
            <div className="tower-overview">
                <Button variant="ghost" onClick={closeOverview} className="tower-overview-back">← Цамхаг сонгох руу</Button>

                <Card className="tower-continue-card">
                    <span className="eyebrow-label">{isDone ? 'Дахин тоглох' : 'Үргэлжлүүлэх'}</span>
                    <h2>{overviewCategory.name}</h2>
                    {overviewFloorMeta && (
                        <p className="tower-continue-meta">
                            Давхар {nextFloorLabel} — {DIFFICULTY_LABELS[overviewFloorMeta.difficulty] || overviewFloorMeta.difficulty} · Дайсны HP {overviewFloorMeta.enemy_hp}
                            {equippedArmor && <> · {PLAYER_START_HP} амь + {equippedArmor.armor_points} армор</>}
                        </p>
                    )}
                    <div className="tower-continue-row">
                        {total > 0 ? (
                            <ProgressBar value={cleared} max={total} variant="accent" label={<span>{cleared}/{total}</span>} />
                        ) : <span className="tower-pending-note">Бэлдэгдэж байна…</span>}
                        <Button onClick={() => onSelectTower(overviewCategory.id, overviewCategory.name)} disabled={total === 0}>
                            {isDone ? 'Дахин тоглох' : `Давхар ${nextFloorLabel} руу`}
                        </Button>
                    </div>
                </Card>

                <div className="tower-overview-grid">
                    <Card className="tower-overview-others">
                        <span className="eyebrow-label">Бусад цамхаг</span>
                        {categories.filter(c => c.id !== overviewCategory.id).map(c => {
                            const t = floorCounts[c.id] || 0;
                            const cl = clearedCount(progressMap[c.id]);
                            return (
                                <button type="button" key={c.id} className="tower-overview-other-row" onClick={() => openOverview(c.id)}>
                                    <span className="tower-overview-other-name">{c.name}</span>
                                    {t > 0 ? (
                                        <ProgressBar value={cl} max={t} variant="accent" label={<span>{cl}/{t}</span>} />
                                    ) : <span className="tower-pending-note">Бэлдэгдэж байна…</span>}
                                </button>
                            );
                        })}
                        {categories.length <= 1 && <p className="tower-pending-note">Бусад цамхаг алга.</p>}
                    </Card>

                    <Card className="tower-overview-stats">
                        <span className="eyebrow-label">7 хоногийн ажил</span>
                        <div className="weekly-chart">
                            {weeklyWins.map(d => (
                                <div key={d.date} className="weekly-bar" style={{ height: `${Math.max(6, (d.count / maxWeekly) * 100)}%` }} title={`${d.date}: ${d.count}`} />
                            ))}
                        </div>
                        <p className="weekly-summary">{totalWeekly} давхар{streak > 0 ? ` · ${streak} хоног дараалан` : ''}</p>

                        {duelInvitePanel}
                    </Card>
                </div>
            </div>
        );
    }

    // --- Цамхаг сонгох (grid) дэлгэц ---
    return (
        <div className="tower-select">
            <div className="tower-select-header">
                <div>
                    <h1>Тавтай морил, {user?.email}!</h1>
                    <p className="tower-select-sub">Цамхгаа сонгож дэвшил үзье!</p>
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

            {duelInvitePanel}

            <div className="tower-grid">
                {categories.length === 0 && (
                    <p className="tower-empty">Одоогоор цамхаг байхгүй байна. "Агуулга удирдах" цэснээс шинэ асуулт нэмж эхлээрэй.</p>
                )}
                {categories
                    .filter(cat => cat.name.toLowerCase().includes(towerSearch.trim().toLowerCase()))
                    .map(cat => {
                    const total = floorCounts[cat.id] || 0;
                    const cleared = clearedCount(progressMap[cat.id]);
                    const ready = total > 0;
                    const pct = ready ? Math.round((cleared / total) * 100) : 0;
                    const isDone = ready && cleared >= total;
                    const tag = towerTag(cat, user, cleared);
                    return (
                        <Card
                            key={cat.id}
                            className={`tower-card${ready ? ' playable' : ' pending'}`}
                            onClick={() => ready && openOverview(cat.id)}
                        >
                            <div className="tower-card-top">
                                <h3>{cat.name}</h3>
                                {tag && <span className="tower-card-tag">{tag}</span>}
                            </div>
                            {ready ? (
                                <>
                                    <div className="tower-card-progress-row">
                                        <ProgressBar value={cleared} max={total} variant="accent" />
                                        <span className="tower-card-pct">{pct}%</span>
                                    </div>
                                    <span className="tower-card-cta">{isDone ? 'Дахин тоглох →' : `Давхар ${cleared + 1} руу →`}</span>
                                </>
                            ) : (
                                <p className="tower-pending-note">Бэлдэгдэж байна…</p>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

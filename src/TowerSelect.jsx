import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import ErrorState from './components/ErrorState.jsx';
import Button from './components/Button.jsx';
import { clearedCount } from './lib/towerLogic.js';
import './TowerSelect.css';

export default function TowerSelect({ user, onSelectTower, onAcceptChallenge }) {
    const [categories, setCategories] = useState([]);
    const [floorCounts, setFloorCounts] = useState({});
    const [progressMap, setProgressMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [towerSearch, setTowerSearch] = useState('');
    const [pendingChallenges, setPendingChallenges] = useState([]);

    useEffect(() => {
        supabase.rpc('duel_get_pending_challenges').then(({ data, error }) => {
            if (!error) setPendingChallenges(data || []);
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

    if (loading) return <p style={{ textAlign: 'center' }}>Таны цамхгуудыг ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Цамхгуудыг ачаалахад алдаа гарлаа." onRetry={fetchTowers} />;

    return (
        <div className="tower-select">
            <h1>Тавтай морил, {user?.email}!</h1>
            <p className="tower-select-sub">Цамхгаа сонгож дэвшил үзье!</p>

            {pendingChallenges.length > 0 && (
                <Card className="pending-challenges-panel">
                    <h3>⚔️ Дуэлийн урилга</h3>
                    {pendingChallenges.map(c => (
                        <div key={c.match_id} className="pending-challenge-row">
                            <span>{c.challenger_name} — {c.category_name}</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <Button variant="success" onClick={() => handleAcceptChallenge(c)}>Тоглох</Button>
                                <Button variant="ghost" onClick={() => handleDeclineChallenge(c)}>Татгалзах</Button>
                            </div>
                        </div>
                    ))}
                </Card>
            )}

            {categories.length > 3 && (
                <input
                    type="text"
                    className="tower-search"
                    placeholder="🔍 Цамхаг хайх..."
                    value={towerSearch}
                    onChange={(e) => setTowerSearch(e.target.value)}
                />
            )}

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
                    return (
                        <Card
                            key={cat.id}
                            className={`tower-card${ready ? ' playable' : ' pending'}`}
                            onClick={() => ready && onSelectTower(cat.id, cat.name)}
                        >
                            <div className="tower-card-icon" aria-hidden="true">🗼</div>
                            <h3>{cat.name}{cat.is_global && <span className="tower-global-badge" title="Үндсэн цамхаг"> 🌐</span>}</h3>
                            {ready ? (
                                <ProgressBar
                                    value={cleared}
                                    max={total}
                                    variant="accent"
                                    label={<span>{cleared}/{total} давхар дийлсэн</span>}
                                />
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

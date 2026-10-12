import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import ErrorState from './components/ErrorState.jsx';
import { clearedCount } from './lib/towerLogic.js';
import './MyTowers.css';

// "Миний цамхагууд" — зөвхөн хэрэглэгчийн хувийн (private) цамхгуудын
// бүрэн жагсаалт. Home.jsx-ийн inline hэсгийн adил render логикийг
// ашиглана, гэхдээ тусдаа дэлгэц болгон CREATE sidebar бүлгээс нэвтэрнэ.
export default function MyTowers({ user, onBack, onSelectTower, onCreateTower }) {
    const [categories, setCategories] = useState([]);
    const [floorCounts, setFloorCounts] = useState({});
    const [progressMap, setProgressMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const fetchTowers = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data: cats, error: catErr } = await supabase
                .from('categories')
                .select('id, name, user_id, is_global')
                .eq('user_id', user.id)
                .eq('is_global', false)
                .order('name', { ascending: true });
            if (catErr) throw catErr;
            setCategories(cats || []);

            const categoryIds = (cats || []).map(c => c.id);
            if (categoryIds.length > 0) {
                const [{ data: floors, error: floorErr }, { data: progress, error: progErr }] = await Promise.all([
                    supabase.from('tower_floors').select('category_id, floor_index').in('category_id', categoryIds),
                    supabase.from('tower_progress').select('category_id, highest_cleared_floor').eq('user_id', user.id).in('category_id', categoryIds),
                ]);
                if (floorErr) throw floorErr;
                if (progErr) throw progErr;
                const counts = {};
                (floors || []).forEach(f => {
                    counts[f.category_id] = Math.max(counts[f.category_id] || 0, f.floor_index + 1);
                });
                setFloorCounts(counts);
                const pMap = {};
                (progress || []).forEach(p => { pMap[p.category_id] = p.highest_cleared_floor; });
                setProgressMap(pMap);
            } else {
                setFloorCounts({});
                setProgressMap({});
            }
        } catch (err) {
            console.error('Error loading my towers:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchTowers();
    }, [fetchTowers]);

    if (loading) return <p style={{ textAlign: 'center' }}>Loading...</p>;
    if (loadError) return <ErrorState message="Failed to load towers." onRetry={fetchTowers} />;

    return (
        <div className="my-towers-page">
            <Button variant="ghost" onClick={onBack} className="my-towers-back">← Back to tower list</Button>
            <div className="my-towers-header">
                <h2>🗼 My Towers</h2>
                <Button onClick={onCreateTower}>➕ New tower</Button>
            </div>

            {categories.length === 0 ? (
                <Card className="my-towers-empty">
                    <p>You haven't created any towers yet.</p>
                    <Button onClick={onCreateTower}>Create your first tower</Button>
                </Card>
            ) : (
                <div className="tower-grid">
                    {categories.map(cat => {
                        const total = floorCounts[cat.id] || 0;
                        const cleared = clearedCount(progressMap[cat.id]);
                        const ready = total > 0;
                        const isDone = ready && cleared >= total;
                        return (
                            <Card
                                key={cat.id}
                                className={`tower-card${ready ? ' playable' : ' pending'}`}
                                onClick={() => ready && onSelectTower(cat.id, cat.name)}
                            >
                                <div className="tower-card-top">
                                    <h3>{cat.name}</h3>
                                </div>
                                {ready ? (
                                    <>
                                        <div className="tower-card-progress-row">
                                            <ProgressBar value={cleared} max={total} variant="accent" />
                                            <span className="tower-card-pct">{Math.round((cleared / total) * 100)}%</span>
                                        </div>
                                        <span className="tower-card-cta">{isDone ? 'Play again →' : `To floor ${cleared + 1} →`}</span>
                                    </>
                                ) : (
                                    <p className="tower-pending-note">Preparing…</p>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

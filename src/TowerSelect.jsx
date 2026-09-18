import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import ErrorState from './components/ErrorState.jsx';
import AchievementBadges from './components/AchievementBadges.jsx';
import { clearedCount } from './lib/towerLogic.js';
import './TowerSelect.css';

export default function TowerSelect({
    user,
    onLogout,
    onSelectTower,
    onCreateQuestion,
    onManageQuestions,
    onBulkImport,
    onOpenAdminDashboard,
    onOpenLeaderboard,
    onOpenFriends,
}) {
    const [categories, setCategories] = useState([]);
    const [floorCounts, setFloorCounts] = useState({});
    const [progressMap, setProgressMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [manageCategoryId, setManageCategoryId] = useState('');
    const [hint, setHint] = useState('');
    const [towerSearch, setTowerSearch] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        supabase.rpc('is_app_admin').then(({ data, error }) => {
            if (!error) setIsAdmin(!!data);
        });
    }, []);

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

    const handleManage = () => {
        if (manageCategoryId) {
            onManageQuestions(manageCategoryId);
        } else {
            setHint('Эхлээд засах ангиллаа сонгоно уу.');
        }
    };

    const handleBulkImport = () => {
        if (manageCategoryId) {
            onBulkImport(manageCategoryId);
        } else {
            setHint('Эхлээд асуулт нэмэх ангиллаа сонгоно уу.');
        }
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Таны цамхгуудыг ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Цамхгуудыг ачаалахад алдаа гарлаа." onRetry={fetchTowers} />;

    return (
        <div className="tower-select">
            <h1>Тавтай морил, {user?.email}!</h1>
            <p className="tower-select-sub">Цамхгаа сонгож дэвшил үзье!</p>
            <AchievementBadges userId={user?.id} />

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
                    <p className="tower-empty">Одоогоор цамхаг байхгүй байна. Доор шинэ асуулт нэмж эхлээрэй.</p>
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

            <Card className="manage-panel">
                <h3>Агуулга удирдах</h3>
                <select value={manageCategoryId} onChange={(e) => setManageCategoryId(e.target.value)}>
                    <option value="">-- Ангилал сонгох --</option>
                    {categories.filter(cat => cat.user_id === user.id).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
                {hint && <p className="tower-hint">{hint}</p>}
                <div className="manage-actions">
                    <Button variant="success" onClick={onCreateQuestion}>Шинэ асуулт нэмэх</Button>
                    <Button variant="ghost" onClick={handleBulkImport}>Олноор оруулах (CSV/Excel)</Button>
                    <Button variant="ghost" onClick={handleManage}>Асуулт удирдах (Засах/Устгах)</Button>
                </div>
            </Card>

            <Button variant="ghost" onClick={onOpenLeaderboard} className="leaderboard-link">
                🏆 Тэргүүлэгчид
            </Button>

            <Button variant="ghost" onClick={onOpenFriends} className="leaderboard-link">
                👥 Найзууд
            </Button>

            {isAdmin && (
                <Button variant="ghost" onClick={onOpenAdminDashboard} className="admin-dashboard-link">
                    🛠 Admin: Бүх цамхаг
                </Button>
            )}

            <Button variant="danger" onClick={onLogout} className="tower-logout">Гарах</Button>
        </div>
    );
}

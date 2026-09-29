import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { awardAchievement } from './lib/achievements.js';
import { useToast } from './components/toastContext.js';
import './Leaderboard.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ user, onBack }) {
    const [rows, setRows] = useState([]);
    const [categories, setCategories] = useState([]);
    const [categoryId, setCategoryId] = useState(''); // '' = бүх категори нийлүүлсэн
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [sortMode, setSortMode] = useState('rank'); // 'rank' | 'name'
    const { showToast } = useToast();

    useEffect(() => {
        supabase
            .from('categories')
            .select('id, name')
            .or(`user_id.eq.${user?.id},is_global.eq.true`)
            .order('name', { ascending: true })
            .then(({ data, error }) => {
                if (!error) setCategories(data || []);
            });
    }, [user]);

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data, error } = await supabase.rpc('get_leaderboard', {
                p_category_id: categoryId || null,
                p_limit: 20,
            });
            if (error) throw error;
            setRows(data || []);
            if (user && data?.some(r => r.user_id === user.id && Number(r.rank) === 1)) {
                awardAchievement(supabase, user.id, 'leaderboard_top1').then(isNew => {
                    if (isNew) showToast({ icon: '🏆', title: 'Шинэ achievement!', message: 'Тэргүүлэгч' });
                });
            }
        } catch (err) {
            console.error('Error loading leaderboard:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [categoryId, user, showToast]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    if (loadError) return <ErrorState message="Тэргүүлэгчдийг ачаалахад алдаа гарлаа." onRetry={fetchLeaderboard} />;

    const myRow = rows.find(r => r.user_id === user?.id);

    const visibleRows = rows
        .filter(r => (r.display_name || '').toLowerCase().includes(searchText.trim().toLowerCase()))
        .slice()
        .sort((a, b) => sortMode === 'name'
            ? (a.display_name || '').localeCompare(b.display_name || '')
            : Number(a.rank) - Number(b.rank));

    return (
        <div className="leaderboard-page">
            <Button variant="ghost" onClick={onBack} className="leaderboard-back">← Буцах</Button>
            <h2>🏆 Тэргүүлэгчид</h2>

            <select
                className="leaderboard-category-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
            >
                <option value="">Бүх цамхаг (нийт)</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
            </select>

            <div className="leaderboard-filters">
                <input
                    type="text"
                    className="leaderboard-search"
                    placeholder="🔍 Нэрээр хайх..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
                <select
                    className="leaderboard-sort-select"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value)}
                >
                    <option value="rank">Эрэмбээр</option>
                    <option value="name">Нэрээр (A-Я)</option>
                </select>
            </div>

            <p className="leaderboard-sub">
                {categoryId ? 'Тухайн цамхагт дийлсэн давхрын тоогоор' : 'Нийт дийлсэн давхрын тоогоор'}
            </p>

            {myRow && (
                <div className="leaderboard-my-stats">
                    <span className="eyebrow-label">Миний үзүүлэлт</span>
                    <p>Эрэмбэ #{myRow.rank} · {myRow.total_floors_cleared} давхар</p>
                </div>
            )}

            {loading ? (
                <p style={{ textAlign: 'center' }}>Тэргүүлэгчдийг ачааллаж байна...</p>
            ) : rows.length === 0 ? (
                <p className="leaderboard-empty">Одоогоор хэн ч давхар дийлээгүй байна.</p>
            ) : visibleRows.length === 0 ? (
                <p className="leaderboard-empty">Хайлтад тохирох тоглогч алга.</p>
            ) : (
                <ol className="leaderboard-list">
                    {visibleRows.map(row => (
                        <li
                            key={row.user_id}
                            className={`leaderboard-row${row.user_id === user?.id ? ' is-you' : ''}`}
                        >
                            <span className="leaderboard-rank">
                                {MEDALS[row.rank - 1] || row.rank}
                            </span>
                            <span className="leaderboard-name">
                                {row.display_name}
                                {row.user_id === user?.id && <span className="leaderboard-you-tag"> (Та)</span>}
                            </span>
                            <span className="leaderboard-score">{row.total_floors_cleared} давхар</span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import './Leaderboard.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ user, onBack }) {
    const [rows, setRows] = useState([]);
    const [categories, setCategories] = useState([]);
    const [categoryId, setCategoryId] = useState(''); // '' = бүх категори нийлүүлсэн
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

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
        } catch (err) {
            console.error('Error loading leaderboard:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [categoryId]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    if (loadError) return <ErrorState message="Тэргүүлэгчдийг ачаалахад алдаа гарлаа." onRetry={fetchLeaderboard} />;

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

            <p className="leaderboard-sub">
                {categoryId ? 'Тухайн цамхагт дийлсэн давхрын тоогоор' : 'Нийт дийлсэн давхрын тоогоор'}
            </p>

            {loading ? (
                <p style={{ textAlign: 'center' }}>Тэргүүлэгчдийг ачааллаж байна...</p>
            ) : rows.length === 0 ? (
                <p className="leaderboard-empty">Одоогоор хэн ч давхар дийлээгүй байна.</p>
            ) : (
                <ol className="leaderboard-list">
                    {rows.map(row => (
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

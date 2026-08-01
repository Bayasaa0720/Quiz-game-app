import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import './Leaderboard.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ user, onBack }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: 20 });
            if (error) throw error;
            setRows(data || []);
        } catch (err) {
            console.error('Error loading leaderboard:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    if (loading) return <p style={{ textAlign: 'center' }}>Тэргүүлэгчдийг ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Тэргүүлэгчдийг ачаалахад алдаа гарлаа." onRetry={fetchLeaderboard} />;

    return (
        <div className="leaderboard-page">
            <Button variant="ghost" onClick={onBack} className="leaderboard-back">← Буцах</Button>
            <h2>🏆 Тэргүүлэгчид</h2>
            <p className="leaderboard-sub">Нийт дийлсэн давхрын тоогоор</p>

            {rows.length === 0 ? (
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

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import './DuelHistory.css';

const RESULT_LABEL = { win: '🏆 Ялалт', lose: '💀 Ялагдал', tie: '🤝 Тэнцээ' };

export default function DuelHistory({ onBack }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data, error } = await supabase.rpc('duel_get_my_history', { p_limit: 30 });
            if (error) throw error;
            setHistory(data || []);
        } catch (err) {
            console.error('Error loading duel history:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    if (loading) return <p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Дуэлийн түүхийг ачаалахад алдаа гарлаа." onRetry={fetchHistory} />;

    const wins = history.filter(h => h.result === 'win').length;
    const losses = history.filter(h => h.result === 'lose').length;
    const ties = history.filter(h => h.result === 'tie').length;

    return (
        <div className="duel-history-page">
            <Button variant="ghost" onClick={onBack} className="duel-history-back">← Цамхаг сонгох руу</Button>
            <h2>📜 Дуэлийн түүх</h2>
            <p className="duel-history-summary">{wins} ялалт · {losses} ялагдал · {ties} тэнцээ</p>

            {history.length === 0 ? (
                <p className="duel-history-empty">Та хараахан дуэл хийгээгүй байна.</p>
            ) : (
                <div className="duel-history-list">
                    {history.map(h => (
                        <Card key={h.match_id} className={`duel-history-row duel-history-${h.result}`}>
                            <span className="duel-history-result">{RESULT_LABEL[h.result]}</span>
                            <span className="duel-history-category">{h.category_name}</span>
                            <span className="duel-history-opponent">vs {h.opponent_name || '—'}</span>
                            <span className="duel-history-score">{h.my_score} : {h.opponent_score}</span>
                            <span className="duel-history-date">{new Date(h.played_at).toLocaleDateString('mn-MN')}</span>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { ACHIEVEMENTS } from './lib/achievements.js';
import { formatCoin } from './lib/formatCoin.js';
import './Achievements.css';

export default function Achievements({ userId, onBack }) {
    const [earnedIds, setEarnedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const fetchEarned = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data, error } = await supabase
                .from('user_achievements')
                .select('achievement_id')
                .eq('user_id', userId);
            if (error) throw error;
            setEarnedIds(new Set((data || []).map(r => r.achievement_id)));
        } catch (err) {
            console.error('Error loading achievements:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchEarned();
    }, [fetchEarned]);

    if (loading) return <p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Тэмдэгтүүдийг ачаалахад алдаа гарлаа." onRetry={fetchEarned} />;

    const earnedCount = ACHIEVEMENTS.filter(a => earnedIds.has(a.id)).length;

    return (
        <div className="achievements-page">
            <Button variant="ghost" onClick={onBack} className="achievements-back">← Профайл руу</Button>
            <h2>🏆 Тэмдэгтүүд</h2>
            <p className="achievements-sub">{earnedCount} / {ACHIEVEMENTS.length} нээгдсэн</p>

            {/* Grid — ирээдүйд achievement олон болоход мөрөнд багтахгүй бол
                зүгээр л шинэ мөр рүү унана, тусад нь код өөрчлөх шаардлагагүй. */}
            <div className="achievements-grid">
                {ACHIEVEMENTS.map(a => {
                    const earned = earnedIds.has(a.id);
                    return (
                        <Card key={a.id} className={`achievement-card${earned ? ' earned' : ' locked'}`}>
                            <span className="achievement-card-icon" aria-hidden="true">{earned ? a.icon : '🔒'}</span>
                            <h3>{a.name}</h3>
                            <p className="achievement-card-desc">{a.description}</p>
                            <span className="achievement-card-coin">🪙 {formatCoin(a.coin)}</span>
                            {earned && <span className="achievement-card-earned-tag">✓ Нээгдсэн</span>}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

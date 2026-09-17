import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { useModal } from './components/modalContext.js';
import './AdminDashboard.css';

export default function AdminDashboard({ onBack }) {
    const [towers, setTowers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [regeneratingId, setRegeneratingId] = useState(null);
    const modal = useModal();

    const fetchTowers = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data, error } = await supabase.rpc('admin_list_towers');
            if (error) throw error;
            setTowers(data || []);
        } catch (err) {
            console.error('Error loading admin tower overview:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTowers();
    }, [fetchTowers]);

    const handleRegenerate = async (tower) => {
        const confirmed = await modal.confirm(
            `«${tower.category_name}» (эзэмшигч: ${tower.owner_email}) цамхгийн бүх давхрыг дахин materialize хийх үү? Тухайн цамхгийн бүх тоглогчийн прогресс дахин эхэлнэ.`,
            { title: 'Давхар шинэчлэх' }
        );
        if (!confirmed) return;

        setRegeneratingId(tower.category_id);
        try {
            const { error } = await supabase.rpc('regenerate_tower_floors', { p_category_id: tower.category_id });
            if (error) throw error;
            await fetchTowers();
            await modal.alert('Давхрууд амжилттай шинэчлэгдлээ.');
        } catch (err) {
            console.error('Error regenerating tower floors:', err);
            await modal.alert('Давхар шинэчлэхэд алдаа гарлаа.');
        } finally {
            setRegeneratingId(null);
        }
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Цамхгуудыг ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Admin мэдээллийг ачаалахад алдаа гарлаа." onRetry={fetchTowers} />;

    return (
        <div className="admin-dashboard">
            <Button variant="ghost" onClick={onBack} className="admin-dashboard-back">← Цамхаг сонгох руу</Button>
            <h2>🛠 Admin: Бүх цамхаг</h2>

            {towers.length === 0 ? (
                <p className="admin-empty">Одоогоор ямар ч цамхаг үүсээгүй байна.</p>
            ) : (
                <div className="admin-tower-list">
                    {towers.map(tower => {
                        const needsMaterialize = Number(tower.floor_count) === 0;
                        return (
                            <Card key={tower.category_id} className="admin-tower-row">
                                <div className="admin-tower-info">
                                    <h3>{tower.category_name}</h3>
                                    <p className="admin-tower-owner">{tower.owner_email}</p>
                                    <p className="admin-tower-stats">
                                        Асуулт: {tower.question_count} · Давхар: {tower.floor_count}
                                        {tower.last_generated_at && (
                                            <> · Сүүлд шинэчилсэн: {new Date(tower.last_generated_at).toLocaleString('mn-MN')}</>
                                        )}
                                    </p>
                                    {needsMaterialize && (
                                        <p className="admin-tower-hint">⚠️ Materialize хийгдээгүй байна</p>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    disabled={regeneratingId === tower.category_id}
                                    onClick={() => handleRegenerate(tower)}
                                >
                                    {regeneratingId === tower.category_id ? 'Шинэчилж байна…' : 'Давхар шинэчлэх'}
                                </Button>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

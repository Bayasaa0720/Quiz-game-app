import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { useModal } from './components/modalContext.js';
import './AdminDashboard.css';

export default function AdminDashboard({ onBack }) {
    const [towers, setTowers] = useState([]);
    const [publicRequests, setPublicRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [regeneratingId, setRegeneratingId] = useState(null);
    const [decidingId, setDecidingId] = useState(null);
    const modal = useModal();

    const fetchTowers = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const [{ data: towerData, error: towerErr }, { data: reqData, error: reqErr }] = await Promise.all([
                supabase.rpc('admin_list_towers'),
                supabase.rpc('admin_list_public_requests'),
            ]);
            if (towerErr) throw towerErr;
            setTowers(towerData || []);
            // Хүсэлтийн жагсаалт нь public_gallery.sql ажиллуулаагүй хуучин
            // environment дээр функц олдохгүй байж болно — тэр тохиолдолд
            // энэ хэсгийг л хоосон үлдээж, бусад Admin функцийг эвдэхгүй.
            if (!reqErr) setPublicRequests(reqData || []);
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

    const handleApprovePublic = async (req) => {
        const confirmed = await modal.confirm(
            `«${req.category_name}» (эзэмшигч: ${req.owner_email}) цамхгийг нийтэд нээх үү? Бүх хэрэглэгчид Tower Select дэлгэц дээр харагдана.`,
            { title: 'Нийтэд нээхийг зөвшөөрөх' }
        );
        if (!confirmed) return;

        setDecidingId(req.category_id);
        try {
            const { error } = await supabase.rpc('admin_approve_public_category', { p_category_id: req.category_id });
            if (error) throw error;
            await fetchTowers();
        } catch (err) {
            console.error('Error approving public category:', err);
            await modal.alert('Зөвшөөрөхөд алдаа гарлаа.');
        } finally {
            setDecidingId(null);
        }
    };

    const handleRejectPublic = async (req) => {
        const confirmed = await modal.confirm(`«${req.category_name}» хүсэлтийг татгалзах уу?`, { title: 'Татгалзах' });
        if (!confirmed) return;

        setDecidingId(req.category_id);
        try {
            const { error } = await supabase.rpc('admin_reject_public_category', { p_category_id: req.category_id });
            if (error) throw error;
            await fetchTowers();
        } catch (err) {
            console.error('Error rejecting public category:', err);
            await modal.alert('Татгалзахад алдаа гарлаа.');
        } finally {
            setDecidingId(null);
        }
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Цамхгуудыг ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Admin мэдээллийг ачаалахад алдаа гарлаа." onRetry={fetchTowers} />;

    return (
        <div className="admin-dashboard">
            <Button variant="ghost" onClick={onBack} className="admin-dashboard-back">← Цамхаг сонгох руу</Button>
            <h2>🛠 Admin: Бүх цамхаг</h2>

            {publicRequests.length > 0 && (
                <>
                    <h3 className="admin-section-title">Нийтэд нээх хүсэлтүүд ({publicRequests.length})</h3>
                    <div className="admin-tower-list">
                        {publicRequests.map(req => (
                            <Card key={req.category_id} className="admin-tower-row">
                                <div className="admin-tower-info">
                                    <h3>{req.category_name}</h3>
                                    <p className="admin-tower-owner">{req.owner_email}</p>
                                    {req.requested_at && (
                                        <p className="admin-tower-stats">
                                            Хүссэн огноо: {new Date(req.requested_at).toLocaleString('mn-MN')}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button
                                        variant="success"
                                        disabled={decidingId === req.category_id}
                                        onClick={() => handleApprovePublic(req)}
                                    >
                                        Зөвшөөрөх
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={decidingId === req.category_id}
                                        onClick={() => handleRejectPublic(req)}
                                    >
                                        Татгалзах
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            <h3 className="admin-section-title">Бүх цамхаг</h3>
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

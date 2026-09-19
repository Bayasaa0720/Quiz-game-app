import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { useModal } from './components/modalContext.js';
import './AdminDashboard.css';

const EMPTY_SHOP_FORM = { id: null, name: '', description: '', icon: '🛡️', armor_points: 1, price: 10, is_active: true };

export default function AdminDashboard({ onBack }) {
    const [towers, setTowers] = useState([]);
    const [publicRequests, setPublicRequests] = useState([]);
    const [shopItems, setShopItems] = useState([]);
    const [shopForm, setShopForm] = useState(EMPTY_SHOP_FORM);
    const [savingShopItem, setSavingShopItem] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [regeneratingId, setRegeneratingId] = useState(null);
    const [decidingId, setDecidingId] = useState(null);
    const modal = useModal();

    const fetchTowers = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const [{ data: towerData, error: towerErr }, { data: reqData, error: reqErr }, { data: shopData, error: shopErr }] = await Promise.all([
                supabase.rpc('admin_list_towers'),
                supabase.rpc('admin_list_public_requests'),
                supabase.rpc('admin_list_shop_items'),
            ]);
            if (towerErr) throw towerErr;
            setTowers(towerData || []);
            // Хүсэлтийн жагсаалт болон дэлгүүрийн эдлэл нь public_gallery.sql /
            // economy.sql ажиллуулаагүй хуучин environment дээр функц олдохгүй
            // байж болно — тэр тохиолдолд тэр хэсгүүдийг л хоосон үлдээнэ.
            if (!reqErr) setPublicRequests(reqData || []);
            if (!shopErr) setShopItems(shopData || []);
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

    const handleSaveShopItem = async () => {
        if (!shopForm.name.trim() || shopForm.price === '' || shopForm.armor_points === '') return;
        setSavingShopItem(true);
        try {
            const { error } = await supabase.rpc('admin_upsert_shop_item', {
                p_id: shopForm.id,
                p_name: shopForm.name.trim(),
                p_description: shopForm.description.trim(),
                p_icon: shopForm.icon.trim() || '🛡️',
                p_armor_points: Number(shopForm.armor_points),
                p_price: Number(shopForm.price),
                p_is_active: shopForm.is_active,
            });
            if (error) throw error;
            setShopForm(EMPTY_SHOP_FORM);
            await fetchTowers();
        } catch (err) {
            console.error('Error saving shop item:', err);
            await modal.alert('Хадгалахад алдаа гарлаа.');
        } finally {
            setSavingShopItem(false);
        }
    };

    const handleDeleteShopItem = async (item) => {
        const confirmed = await modal.confirm(`«${item.name}» эдлэлийг устгах уу?`, { title: 'Устгах' });
        if (!confirmed) return;
        const { error } = await supabase.rpc('admin_delete_shop_item', { p_id: item.id });
        if (!error) await fetchTowers();
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

            <h3 className="admin-section-title">Дэлгүүрийн эдлэл удирдах</h3>
            <Card className="admin-shop-form">
                <div className="admin-shop-form-grid">
                    <input
                        type="text"
                        placeholder="Нэр"
                        value={shopForm.name}
                        onChange={(e) => setShopForm(f => ({ ...f, name: e.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Icon (emoji)"
                        value={shopForm.icon}
                        onChange={(e) => setShopForm(f => ({ ...f, icon: e.target.value }))}
                    />
                    <input
                        type="number"
                        min="0"
                        placeholder="Армор"
                        value={shopForm.armor_points}
                        onChange={(e) => setShopForm(f => ({ ...f, armor_points: e.target.value }))}
                    />
                    <input
                        type="number"
                        min="0"
                        placeholder="Үнэ (оноо)"
                        value={shopForm.price}
                        onChange={(e) => setShopForm(f => ({ ...f, price: e.target.value }))}
                    />
                </div>
                <input
                    type="text"
                    placeholder="Тайлбар"
                    value={shopForm.description}
                    onChange={(e) => setShopForm(f => ({ ...f, description: e.target.value }))}
                    className="admin-shop-form-desc"
                />
                <label className="admin-shop-form-active">
                    <input
                        type="checkbox"
                        checked={shopForm.is_active}
                        onChange={(e) => setShopForm(f => ({ ...f, is_active: e.target.checked }))}
                    />
                    Идэвхтэй (дэлгүүрт харагдана)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="success" onClick={handleSaveShopItem} disabled={savingShopItem}>
                        {shopForm.id ? 'Хадгалах' : 'Нэмэх'}
                    </Button>
                    {shopForm.id && (
                        <Button variant="ghost" onClick={() => setShopForm(EMPTY_SHOP_FORM)}>Цуцлах</Button>
                    )}
                </div>
            </Card>

            {shopItems.length === 0 ? (
                <p className="admin-empty">Дэлгүүрт эдлэл алга байна.</p>
            ) : (
                <div className="admin-tower-list">
                    {shopItems.map(item => (
                        <Card key={item.id} className="admin-tower-row">
                            <div className="admin-tower-info">
                                <h3>{item.icon} {item.name}{!item.is_active && ' (идэвхгүй)'}</h3>
                                <p className="admin-tower-stats">
                                    Армор: {item.armor_points} · Үнэ: {item.price} оноо
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="ghost" onClick={() => setShopForm({ ...item, armor_points: String(item.armor_points), price: String(item.price) })}>
                                    Засах
                                </Button>
                                <Button variant="danger" onClick={() => handleDeleteShopItem(item)}>Устгах</Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

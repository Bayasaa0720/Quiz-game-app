import { useState, useEffect, useCallback, useRef } from 'react';
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
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const fetchTowers = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const [{ data: towerData, error: towerErr }, { data: reqData, error: reqErr }, { data: shopData, error: shopErr }] = await Promise.all([
                supabase.rpc('admin_list_towers'),
                supabase.rpc('admin_list_public_requests'),
                supabase.rpc('admin_list_shop_items'),
            ]);
            if (!mountedRef.current) return;
            if (towerErr) throw towerErr;
            setTowers(towerData || []);
            // Хүсэлтийн жагсаалт болон дэлгүүрийн эдлэл нь public_gallery.sql /
            // economy.sql ажиллуулаагүй хуучин environment дээр функц олдохгүй
            // байж болно — тэр тохиолдолд тэр хэсгүүдийг л хоосон үлдээнэ.
            if (!reqErr) setPublicRequests(reqData || []);
            if (!shopErr) setShopItems(shopData || []);
        } catch (err) {
            console.error('Error loading admin tower overview:', err);
            if (mountedRef.current) setLoadError(true);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTowers();
    }, [fetchTowers]);

    const handleRegenerate = async (tower) => {
        const confirmed = await modal.confirm(
            `Regenerate all floors of "${tower.category_name}" (owner: ${tower.owner_email})? Every player's progress in this tower will reset.`,
            { title: 'Regenerate floors' }
        );
        if (!confirmed) return;

        setRegeneratingId(tower.category_id);
        try {
            const { error } = await supabase.rpc('regenerate_tower_floors', { p_category_id: tower.category_id });
            if (error) throw error;
            await fetchTowers();
            await modal.alert('Floors regenerated successfully.');
        } catch (err) {
            console.error('Error regenerating tower floors:', err);
            await modal.alert('Failed to regenerate floors.');
        } finally {
            setRegeneratingId(null);
        }
    };

    const handleApprovePublic = async (req) => {
        const confirmed = await modal.confirm(
            `Make "${req.category_name}" (owner: ${req.owner_email}) public? It will appear to all users on the Tower Select screen.`,
            { title: 'Approve public request' }
        );
        if (!confirmed) return;

        setDecidingId(req.category_id);
        try {
            const { error } = await supabase.rpc('admin_approve_public_category', { p_category_id: req.category_id });
            if (error) throw error;
            await fetchTowers();
        } catch (err) {
            console.error('Error approving public category:', err);
            await modal.alert('Failed to approve.');
        } finally {
            setDecidingId(null);
        }
    };

    const handleRejectPublic = async (req) => {
        const confirmed = await modal.confirm(`Reject the request for "${req.category_name}"?`, { title: 'Reject' });
        if (!confirmed) return;

        setDecidingId(req.category_id);
        try {
            const { error } = await supabase.rpc('admin_reject_public_category', { p_category_id: req.category_id });
            if (error) throw error;
            await fetchTowers();
        } catch (err) {
            console.error('Error rejecting public category:', err);
            await modal.alert('Failed to reject.');
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
            await modal.alert('Failed to save.');
        } finally {
            setSavingShopItem(false);
        }
    };

    const handleDeleteShopItem = async (item) => {
        const confirmed = await modal.confirm(`Delete "${item.name}"?`, { title: 'Delete' });
        if (!confirmed) return;
        const { error } = await supabase.rpc('admin_delete_shop_item', { p_id: item.id });
        if (!error) await fetchTowers();
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Loading towers...</p>;
    if (loadError) return <ErrorState message="Failed to load admin data." onRetry={fetchTowers} />;

    return (
        <div className="admin-dashboard">
            <Button variant="ghost" onClick={onBack} className="admin-dashboard-back">← Back to tower list</Button>
            <h2>🛠 Admin: All towers</h2>

            {publicRequests.length > 0 && (
                <>
                    <h3 className="admin-section-title">Public requests ({publicRequests.length})</h3>
                    <div className="admin-tower-list">
                        {publicRequests.map(req => (
                            <Card key={req.category_id} className="admin-tower-row">
                                <div className="admin-tower-info">
                                    <h3>{req.category_name}</h3>
                                    <p className="admin-tower-owner">{req.owner_email}</p>
                                    {req.requested_at && (
                                        <p className="admin-tower-stats">
                                            Requested: {new Date(req.requested_at).toLocaleString('en-US')}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button
                                        variant="success"
                                        disabled={decidingId === req.category_id}
                                        onClick={() => handleApprovePublic(req)}
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={decidingId === req.category_id}
                                        onClick={() => handleRejectPublic(req)}
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            <h3 className="admin-section-title">All towers</h3>
            {towers.length === 0 ? (
                <p className="admin-empty">No towers created yet.</p>
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
                                        Questions: {tower.question_count} · Floors: {tower.floor_count}
                                        {tower.last_generated_at && (
                                            <> · Last regenerated: {new Date(tower.last_generated_at).toLocaleString('en-US')}</>
                                        )}
                                    </p>
                                    {needsMaterialize && (
                                        <p className="admin-tower-hint">⚠️ Not yet materialized</p>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    disabled={regeneratingId === tower.category_id}
                                    onClick={() => handleRegenerate(tower)}
                                >
                                    {regeneratingId === tower.category_id ? 'Regenerating…' : 'Regenerate floors'}
                                </Button>
                            </Card>
                        );
                    })}
                </div>
            )}

            <h3 className="admin-section-title">Manage shop items</h3>
            <Card className="admin-shop-form">
                <div className="admin-shop-form-grid">
                    <input
                        type="text"
                        placeholder="Name"
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
                        placeholder="Armor"
                        value={shopForm.armor_points}
                        onChange={(e) => setShopForm(f => ({ ...f, armor_points: e.target.value }))}
                    />
                    <input
                        type="number"
                        min="0"
                        placeholder="Price (coin)"
                        value={shopForm.price}
                        onChange={(e) => setShopForm(f => ({ ...f, price: e.target.value }))}
                    />
                </div>
                <input
                    type="text"
                    placeholder="Description"
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
                    Active (visible in shop)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="success" onClick={handleSaveShopItem} disabled={savingShopItem}>
                        {shopForm.id ? 'Save' : 'Add'}
                    </Button>
                    {shopForm.id && (
                        <Button variant="ghost" onClick={() => setShopForm(EMPTY_SHOP_FORM)}>Cancel</Button>
                    )}
                </div>
            </Card>

            {shopItems.length === 0 ? (
                <p className="admin-empty">No items in the shop.</p>
            ) : (
                <div className="admin-tower-list">
                    {shopItems.map(item => (
                        <Card key={item.id} className="admin-tower-row">
                            <div className="admin-tower-info">
                                <h3>{item.icon} {item.name}{!item.is_active && ' (inactive)'}</h3>
                                <p className="admin-tower-stats">
                                    Armor: {item.armor_points} · Price: {item.price} coin
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="ghost" onClick={() => setShopForm({ ...item, armor_points: String(item.armor_points), price: String(item.price) })}>
                                    Edit
                                </Button>
                                <Button variant="danger" onClick={() => handleDeleteShopItem(item)}>Delete</Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import './Inventory.css';

export default function Inventory({ user, onBack }) {
    const [items, setItems] = useState([]);
    const [equippedId, setEquippedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const fetchInventory = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const [{ data: inv, error: invErr }, { data: profile, error: profErr }] = await Promise.all([
                supabase.from('user_inventory').select('item_id, acquired_at, shop_items(*)').eq('user_id', user.id),
                supabase.from('user_profiles').select('equipped_item_id').eq('user_id', user.id).maybeSingle(),
            ]);
            if (invErr || profErr) throw invErr || profErr;
            setItems(inv || []);
            setEquippedId(profile?.equipped_item_id || null);
        } catch (err) {
            console.error('Error loading inventory:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const handleToggleEquip = async (itemId) => {
        setBusyId(itemId);
        const nextId = equippedId === itemId ? null : itemId;
        const { error } = await supabase.rpc('equip_item', { p_item_id: nextId });
        if (!error) setEquippedId(nextId);
        setBusyId(null);
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Инвентарыг ачаалахад алдаа гарлаа." onRetry={fetchInventory} />;

    return (
        <div className="inventory-page">
            <Button variant="ghost" onClick={onBack} className="inventory-back">← Цамхаг сонгох руу</Button>
            <h2>🎒 Инвентар</h2>
            <p className="inventory-sub">Цамхагт орохоосоо өмнө нэг армор идэвхжүүлж болно.</p>

            {items.length === 0 ? (
                <p className="inventory-empty">Танд одоогоор эдлэл алга. Дэлгүүрээс худалдаж аваарай.</p>
            ) : (
                <div className="inventory-grid">
                    {items.map(({ item_id, shop_items: item }) => (
                        <Card key={item_id} className={`inventory-item${equippedId === item_id ? ' equipped' : ''}`}>
                            <span className="inventory-item-icon" aria-hidden="true">{item.icon}</span>
                            <h3>{item.name}</h3>
                            <p className="inventory-item-desc">{item.description}</p>
                            <p className="inventory-item-armor">🛡️ {item.armor_points}</p>
                            <Button
                                variant={equippedId === item_id ? 'success' : 'ghost'}
                                onClick={() => handleToggleEquip(item_id)}
                                disabled={busyId === item_id}
                            >
                                {equippedId === item_id ? '✓ Идэвхтэй' : 'Идэвхжүүлэх'}
                            </Button>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

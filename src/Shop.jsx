import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { useModal } from './components/modalContext.js';
import { useToast } from './components/toastContext.js';
import { formatCoin } from './lib/formatCoin.js';
import './Shop.css';

export default function Shop({ user, onBack }) {
    const [items, setItems] = useState([]);
    const [ownedIds, setOwnedIds] = useState(new Set());
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [buyingId, setBuyingId] = useState(null);
    const modal = useModal();
    const { showToast } = useToast();

    const fetchShop = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const [{ data: shopItems, error: itemsErr }, { data: owned, error: ownedErr }, { data: pts, error: ptsErr }] = await Promise.all([
                supabase.from('shop_items').select('*').eq('is_active', true).order('price', { ascending: true }),
                supabase.from('user_inventory').select('item_id').eq('user_id', user.id),
                supabase.from('user_points').select('balance').eq('user_id', user.id).maybeSingle(),
            ]);
            if (itemsErr || ownedErr || ptsErr) throw itemsErr || ownedErr || ptsErr;
            setItems(shopItems || []);
            setOwnedIds(new Set((owned || []).map(o => o.item_id)));
            setBalance(Number(pts?.balance) || 0);
        } catch (err) {
            console.error('Error loading shop:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchShop();
    }, [fetchShop]);

    const handleBuy = async (item) => {
        setBuyingId(item.id);
        const { data: newBalance, error } = await supabase.rpc('shop_purchase_item', { p_item_id: item.id });
        setBuyingId(null);
        if (error) {
            await modal.alert(error.message || 'Худалдаж авахад алдаа гарлаа.');
            return;
        }
        setBalance(Number(newBalance) || 0);
        setOwnedIds(s => new Set([...s, item.id]));
        showToast({ icon: item.icon || '🛡️', title: `${item.name} худалдаж авлаа`, message: 'Идэвхжүүлэхийн тулд 🎒 Инвентар руу орно уу' });
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Дэлгүүрийг ачаалахад алдаа гарлаа." onRetry={fetchShop} />;

    return (
        <div className="shop-page">
            <Button variant="ghost" onClick={onBack} className="shop-back">← Цамхаг сонгох руу</Button>
            <div className="shop-header">
                <h2>🛒 Дэлгүүр</h2>
                <span className="shop-balance">🪙 {formatCoin(balance)} coin</span>
            </div>

            {items.length === 0 ? (
                <p className="shop-empty">Дэлгүүрт эдлэл алга байна.</p>
            ) : (
                <div className="shop-grid">
                    {items.map(item => {
                        const owned = ownedIds.has(item.id);
                        const canAfford = balance >= item.price;
                        return (
                            <Card key={item.id} className="shop-item">
                                <span className="shop-item-icon" aria-hidden="true">{item.icon}</span>
                                <h3>{item.name}</h3>
                                <p className="shop-item-desc">{item.description}</p>
                                <p className="shop-item-armor">🛡️ {item.armor_points}</p>
                                <p className="shop-item-price">🪙 {formatCoin(item.price)}</p>
                                <Button
                                    variant={owned ? 'ghost' : 'success'}
                                    onClick={() => handleBuy(item)}
                                    disabled={owned || !canAfford || buyingId === item.id}
                                >
                                    {owned ? '✓ Эзэмшсэн' : canAfford ? 'Худалдаж авах' : 'Coin хүрэхгүй'}
                                </Button>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

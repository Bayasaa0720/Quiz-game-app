import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import { useModal } from './components/modalContext.js';
import ErrorState from './components/ErrorState.jsx';
import PlayerCharacter from './components/PlayerCharacter.jsx';
import { getFloorState, DIFFICULTY_LABELS } from './lib/towerLogic.js';
import './TowerView.css';

const PLAYER_START_HP = 3;

export default function TowerView({ user, isGuest, guestHighestCleared, categoryId, categoryName, onSelectFloor, onStartDuel, onBack, onOpenInventory }) {
    const [floors, setFloors] = useState([]);
    const [highestCleared, setHighestCleared] = useState(-1);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [equippedArmor, setEquippedArmor] = useState(null);
    const modal = useModal();

    const fetchTower = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data: floorRows, error: floorErr } = await supabase
                .from('tower_floors')
                .select('id, floor_index, difficulty, question_ids, enemy_hp')
                .eq('category_id', categoryId)
                .order('floor_index', { ascending: true });
            if (floorErr) throw floorErr;
            setFloors(floorRows || []);

            if (isGuest) {
                setHighestCleared(guestHighestCleared ?? -1);
            } else {
                const { data: progress, error: progErr } = await supabase
                    .from('tower_progress')
                    .select('highest_cleared_floor')
                    .eq('user_id', user.id)
                    .eq('category_id', categoryId)
                    .maybeSingle();
                if (progErr) throw progErr;
                setHighestCleared(progress?.highest_cleared_floor ?? -1);
            }
        } catch (err) {
            console.error('Error loading tower floors:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [categoryId, user, isGuest, guestHighestCleared]);

    useEffect(() => {
        fetchTower();
    }, [fetchTower]);

    useEffect(() => {
        if (isGuest) return;
        supabase.rpc('is_app_admin').then(({ data, error }) => {
            if (!error) setIsAdmin(!!data);
        });
        supabase.rpc('get_my_equipped_armor').then(({ data, error }) => {
            if (!error) setEquippedArmor(data?.[0] || null);
        });
    }, [isGuest]);

    const handleRegenerate = async () => {
        const confirmed = await modal.confirm(
            'Энэ цамхгийн бүх давхрыг одоогийн асуултуудаас дахин materialize хийх үү? Тухайн цамхгийн бүх тоглогчийн прогресс дахин эхэлнэ.',
            { title: 'Давхар шинэчлэх' }
        );
        if (!confirmed) return;

        setRegenerating(true);
        try {
            const { error } = await supabase.rpc('regenerate_tower_floors', { p_category_id: categoryId });
            if (error) throw error;
            await fetchTower();
            await modal.alert('Давхрууд амжилттай шинэчлэгдлээ.');
        } catch (err) {
            console.error('Error regenerating tower floors:', err);
            await modal.alert('Давхар шинэчлэхэд алдаа гарлаа.');
        } finally {
            setRegenerating(false);
        }
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Цамхгийг ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Цамхгийг ачаалахад алдаа гарлаа." onRetry={fetchTower} />;

    const cleared = highestCleared + 1;
    const total = floors.length;
    const pct = total > 0 ? Math.round((cleared / total) * 100) : 0;

    return (
        <div className="tower-view">
            <Button variant="ghost" onClick={onBack} className="tower-view-back">← Цамхаг сонгох руу</Button>
            <h2>{categoryName}</h2>

            <div className="tower-view-walker">
                <PlayerCharacter anim="walk" size={64} />
            </div>

            {!isGuest && (
                <Button variant="ghost" onClick={() => onStartDuel(categoryId, categoryName)} className="tower-view-duel-btn">
                    ⚔️ 1v1 өрсөлдөх
                </Button>
            )}

            {isAdmin && (
                <Button
                    variant="ghost"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="tower-view-admin-action"
                >
                    🛠 {regenerating ? 'Шинэчилж байна…' : 'Давхар шинэчлэх (Admin)'}
                </Button>
            )}

            <div className="tower-view-body">
                <div className="floor-list">
                    {floors.length === 0 && (
                        <p className="tower-empty">Энэ цамхаг бэлдэгдээгүй байна.</p>
                    )}
                    {floors.map(floor => {
                        const state = getFloorState(floor.floor_index, highestCleared);
                        return (
                            <Card
                                key={floor.id}
                                className={`floor-item floor-${state}`}
                                onClick={() => state !== 'locked' && onSelectFloor(floor)}
                            >
                                <span className="floor-index">Давхар {floor.floor_index + 1}</span>
                                <span className={`difficulty-badge difficulty-${floor.difficulty}`}>
                                    {DIFFICULTY_LABELS[floor.difficulty] || floor.difficulty}
                                </span>
                                <span className="floor-enemy">👹 HP {floor.enemy_hp}</span>
                                <span className="floor-state">
                                    {state === 'cleared' && '✅ Дийлсэн'}
                                    {state === 'current' && '⚔️ Тоглох боломжтой'}
                                    {state === 'locked' && '🔒 Түгжээтэй'}
                                </span>
                            </Card>
                        );
                    })}
                </div>

                {total > 0 && (
                    <div className="tower-view-rail">
                        <Card className="tower-view-progress-card">
                            <span className="eyebrow-label">Явц</span>
                            <p className="tower-view-progress-pct">{pct}%</p>
                            <p className="tower-pending-note">{cleared}/{total} давхар дийлсэн</p>
                        </Card>

                        <Card className="tower-view-loadout-card">
                            <span className="eyebrow-label">Орох бэлтгэл</span>
                            <p className="tower-view-loadout-row">❤️ Амь: {PLAYER_START_HP}</p>
                            <p className="tower-view-loadout-row">
                                🛡️ {equippedArmor ? `${equippedArmor.name} (+${equippedArmor.armor_points})` : 'Хуяггүй'}
                            </p>
                            {!isGuest && (
                                <button type="button" className="tower-view-loadout-change" onClick={onOpenInventory}>
                                    Хуяг солих →
                                </button>
                            )}
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}

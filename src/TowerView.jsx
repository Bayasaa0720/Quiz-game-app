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

export default function TowerView({ user, isGuest, guestHighestCleared, categoryId, categoryName, equippedArmor, isAdmin, onSelectFloor, onStartDuel, onStartReview, onBack, onOpenInventory }) {
    const [floors, setFloors] = useState([]);
    const [highestCleared, setHighestCleared] = useState(-1);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
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

    const handleRegenerate = async () => {
        const confirmed = await modal.confirm(
            'Rebuild all floors of this tower from the current questions? Every player\'s progress in this tower will reset.',
            { title: 'Regenerate floors' }
        );
        if (!confirmed) return;

        setRegenerating(true);
        try {
            const { error } = await supabase.rpc('regenerate_tower_floors', { p_category_id: categoryId });
            if (error) throw error;
            await fetchTower();
            await modal.alert('Floors regenerated successfully.');
        } catch (err) {
            console.error('Error regenerating tower floors:', err);
            await modal.alert('Failed to regenerate floors.');
        } finally {
            setRegenerating(false);
        }
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Loading tower...</p>;
    if (loadError) return <ErrorState message="Failed to load tower." onRetry={fetchTower} />;

    const cleared = highestCleared + 1;
    const total = floors.length;
    const pct = total > 0 ? Math.round((cleared / total) * 100) : 0;

    return (
        <div className="tower-view">
            <Button variant="ghost" onClick={onBack} className="tower-view-back">← Back to tower list</Button>
            <h2>{categoryName}</h2>

            <div className="tower-view-walker">
                <PlayerCharacter anim="walk" size={64} />
            </div>

            {!isGuest && (
                <Button variant="ghost" onClick={() => onStartDuel(categoryId, categoryName)} className="tower-view-duel-btn">
                    ⚔️ 1v1 duel
                </Button>
            )}

            {highestCleared >= 0 && (
                <Button
                    variant="ghost"
                    onClick={() => onStartReview(categoryId, categoryName, highestCleared)}
                    className="tower-view-review-btn"
                >
                    📚 Review cleared questions
                </Button>
            )}

            {isAdmin && (
                <Button
                    variant="ghost"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="tower-view-admin-action"
                >
                    🛠 {regenerating ? 'Regenerating…' : 'Regenerate floors (Admin)'}
                </Button>
            )}

            <div className="tower-view-body">
                <div className="floor-path">
                    {floors.length === 0 && (
                        <p className="tower-empty">This tower isn't ready yet.</p>
                    )}
                    {floors.map((floor, i) => {
                        const state = getFloorState(floor.floor_index, highestCleared);
                        const connectorClimbed = i < floors.length - 1 && state === 'cleared';
                        return (
                            <div key={floor.id} className="floor-row">
                                <div className="floor-node-col">
                                    <span className={`floor-node floor-node-${state}`}>
                                        {state === 'cleared' && '✓'}
                                        {state === 'current' && (floor.floor_index + 1)}
                                        {state === 'locked' && '🔒'}
                                    </span>
                                    {i < floors.length - 1 && (
                                        <span className={`floor-connector${connectorClimbed ? ' floor-connector-climbed' : ''}`} />
                                    )}
                                </div>
                                <Card
                                    className={`floor-item floor-${state}`}
                                    onClick={() => state !== 'locked' && onSelectFloor(floor)}
                                >
                                    <span className="floor-index">Floor {floor.floor_index + 1}</span>
                                    <span className={`difficulty-badge difficulty-${floor.difficulty}`}>
                                        {DIFFICULTY_LABELS[floor.difficulty] || floor.difficulty}
                                    </span>
                                    <span className="floor-enemy">👹 HP {floor.enemy_hp}</span>
                                    <span className="floor-state">
                                        {state === 'cleared' && '✅ Cleared'}
                                        {state === 'current' && '⚔️ Playable'}
                                        {state === 'locked' && '🔒 Locked'}
                                    </span>
                                </Card>
                            </div>
                        );
                    })}
                </div>

                {total > 0 && (
                    <div className="tower-view-rail">
                        <Card className="tower-view-progress-card">
                            <span className="eyebrow-label">Progress</span>
                            <p className="tower-view-progress-pct">{pct}%</p>
                            <p className="tower-pending-note">{cleared}/{total} floors cleared</p>
                        </Card>

                        <Card className="tower-view-loadout-card">
                            <span className="eyebrow-label">Loadout</span>
                            <p className="tower-view-loadout-row">❤️ Lives: {PLAYER_START_HP}</p>
                            <p className="tower-view-loadout-row">
                                🛡️ {equippedArmor ? `${equippedArmor.name} (+${equippedArmor.armor_points})` : 'No armor'}
                            </p>
                            {!isGuest && (
                                <button type="button" className="tower-view-loadout-change" onClick={onOpenInventory}>
                                    Change armor →
                                </button>
                            )}
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}

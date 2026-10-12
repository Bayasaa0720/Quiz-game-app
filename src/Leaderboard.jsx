import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { awardAchievement } from './lib/achievements.js';
import { useToast } from './components/toastContext.js';
import './Leaderboard.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ user, onBack }) {
    const [rows, setRows] = useState([]);
    const [categories, setCategories] = useState([]);
    const [categoryId, setCategoryId] = useState(''); // '' = бүх категори нийлүүлсэн
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [sortMode, setSortMode] = useState('rank'); // 'rank' | 'name'
    const { showToast } = useToast();

    useEffect(() => {
        supabase
            .from('categories')
            .select('id, name')
            .or(`user_id.eq.${user?.id},is_global.eq.true`)
            .order('name', { ascending: true })
            .then(({ data, error }) => {
                if (!error) setCategories(data || []);
            });
    }, [user]);

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data, error } = await supabase.rpc('get_leaderboard', {
                p_category_id: categoryId || null,
                p_limit: 20,
            });
            if (error) throw error;
            setRows(data || []);
            if (user && data?.some(r => r.user_id === user.id && Number(r.rank) === 1)) {
                awardAchievement(supabase, user.id, 'leaderboard_top1').then(isNew => {
                    if (isNew) showToast({ icon: '🏆', title: 'New achievement!', message: 'Top of the Board' });
                });
            }
        } catch (err) {
            console.error('Error loading leaderboard:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [categoryId, user, showToast]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    if (loadError) return <ErrorState message="Failed to load the leaderboard." onRetry={fetchLeaderboard} />;

    const myRow = rows.find(r => r.user_id === user?.id);

    const visibleRows = rows
        .filter(r => (r.display_name || '').toLowerCase().includes(searchText.trim().toLowerCase()))
        .slice()
        .sort((a, b) => sortMode === 'name'
            ? (a.display_name || '').localeCompare(b.display_name || '')
            : Number(a.rank) - Number(b.rank));

    const showPodium = sortMode === 'rank' && !searchText.trim() && visibleRows.length > 0;
    const podiumRows = showPodium ? visibleRows.slice(0, 3) : [];
    // Сонгодог podium байрлал: 2-р байр зүүн, 1-р байр төв (хамгийн өндөр), 3-р байр баруун.
    const podiumOrder = [podiumRows[1], podiumRows[0], podiumRows[2]].filter(Boolean);

    return (
        <div className="leaderboard-page">
            <Button variant="ghost" onClick={onBack} className="leaderboard-back">← Back</Button>
            <h2>🏆 Leaderboard</h2>

            <select
                className="leaderboard-category-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
            >
                <option value="">All towers (combined)</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
            </select>

            <div className="leaderboard-filters">
                <input
                    type="text"
                    className="leaderboard-search"
                    placeholder="🔍 Search by name..."
                    aria-label="Search by name"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
                <select
                    className="leaderboard-sort-select"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value)}
                >
                    <option value="rank">By rank</option>
                    <option value="name">By name (A-Z)</option>
                </select>
            </div>

            <p className="leaderboard-sub">
                {categoryId ? 'By floors cleared in this tower' : 'By total floors cleared'}
            </p>

            {showPodium && podiumOrder.length > 0 && (
                <div className="leaderboard-podium">
                    {podiumOrder.map(row => (
                        <div key={row.user_id} className={`podium-stand podium-rank-${row.rank}`}>
                            <div className="podium-avatar" aria-hidden="true">
                                {row.avatar_url ? (
                                    <img src={row.avatar_url} alt="" />
                                ) : (
                                    <span>{MEDALS[row.rank - 1] || '👤'}</span>
                                )}
                            </div>
                            <span className="podium-name">
                                {row.display_name}{row.user_id === user?.id && ' (You)'}
                            </span>
                            <span className="podium-score">{row.total_floors_cleared} floors</span>
                            <div className="podium-block">{MEDALS[row.rank - 1] || row.rank}</div>
                        </div>
                    ))}
                </div>
            )}

            {myRow && (
                <div className="leaderboard-my-stats">
                    <span className="eyebrow-label">My stats</span>
                    <p>Rank #{myRow.rank} · {myRow.total_floors_cleared} floors</p>
                </div>
            )}

            {loading ? (
                <p style={{ textAlign: 'center' }}>Loading leaderboard...</p>
            ) : rows.length === 0 ? (
                <p className="leaderboard-empty">No one has cleared a floor yet.</p>
            ) : visibleRows.length === 0 ? (
                <p className="leaderboard-empty">No players match your search.</p>
            ) : (
                <ol className="leaderboard-list">
                    {visibleRows.map(row => (
                        <li
                            key={row.user_id}
                            className={`leaderboard-row${row.user_id === user?.id ? ' is-you' : ''}`}
                        >
                            <span className="leaderboard-rank">
                                {MEDALS[row.rank - 1] || row.rank}
                            </span>
                            <span className="leaderboard-name">
                                {row.display_name}
                                {row.user_id === user?.id && <span className="leaderboard-you-tag"> (You)</span>}
                            </span>
                            <span className="leaderboard-score">{row.total_floors_cleared} floors</span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

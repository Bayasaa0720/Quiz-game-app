import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { useModal } from './components/modalContext.js';
import './FriendsDuel.css';

const RESULT_LABEL = { win: '🏆 Ялалт', lose: '💀 Ялагдал', tie: '🤝 Тэнцээ' };

// Tower Climb App.html deck-ийн "Найзууд ба Duel" нэгтгэсэн дэлгэц — хуучин
// Friends.jsx + DuelHistory.jsx-ийн орлуулга.
export default function FriendsDuel({ user, onBack, onChallengeCreated }) {
    const [friendships, setFriendships] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [categories, setCategories] = useState([]);
    const [challengeCategoryId, setChallengeCategoryId] = useState('');
    const [challengingId, setChallengingId] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState(false);
    const modal = useModal();

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError(false);
        const { data, error } = await supabase.rpc('duel_get_my_history', { p_limit: 30 });
        if (error) {
            console.error('Error loading duel history:', error);
            setHistoryError(true);
        } else {
            setHistory(data || []);
        }
        setHistoryLoading(false);
    }, []);

    useEffect(() => {
        supabase
            .from('categories')
            .select('id, name, user_id, is_global')
            .or(`user_id.eq.${user.id},is_global.eq.true`)
            .order('name', { ascending: true })
            .then(({ data }) => {
                setCategories(data || []);
                if (data?.length) setChallengeCategoryId(prev => prev || data[0].id);
            });
        fetchHistory();
    }, [user.id, fetchHistory]);

    const fetchFriendships = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data, error } = await supabase
                .from('friendships')
                .select('id, requester_id, addressee_id, status, created_at')
                .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
            if (error) throw error;
            setFriendships(data || []);

            const otherIds = (data || []).map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);
            if (otherIds.length > 0) {
                const { data: statsData, error: statsErr } = await supabase.rpc('get_user_stats', { p_user_ids: otherIds });
                if (statsErr) throw statsErr;
                const map = {};
                (statsData || []).forEach(s => { map[s.user_id] = s; });
                setStats(map);
            } else {
                setStats({});
            }
        } catch (err) {
            console.error('Error loading friends:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchFriendships();
    }, [fetchFriendships]);

    // duel_get_my_history opponent_id буцаадаггүй тул нэрээр таарууулна
    // (өрсөлдөгчийн display_name давхцах магадлал бага — яг таг биш ч
    // шинэ schema/RPC өөрчлөлт хийхгүйгээр хамгийн ойрхон ойролцоо тоо).
    const duelRecordByName = useMemo(() => {
        const map = {};
        history.forEach(h => {
            if (!h.opponent_name) return;
            const rec = map[h.opponent_name] || { wins: 0, losses: 0, ties: 0 };
            if (h.result === 'win') rec.wins++;
            else if (h.result === 'lose') rec.losses++;
            else rec.ties++;
            map[h.opponent_name] = rec;
        });
        return map;
    }, [history]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchText.trim()) return;
        setSearching(true);
        try {
            const { data, error } = await supabase.rpc('search_users_by_email', { p_query: searchText.trim() });
            if (error) throw error;
            setSearchResults(data || []);
        } catch (err) {
            console.error('Search failed:', err);
            await modal.alert('Хайхад алдаа гарлаа.');
        } finally {
            setSearching(false);
        }
    };

    const sendRequest = async (targetUserId) => {
        const { error } = await supabase.from('friendships').insert({
            requester_id: user.id,
            addressee_id: targetUserId,
        });
        if (error) {
            console.error('Failed to send request:', error);
            await modal.alert('Хүсэлт илгээхэд алдаа гарлаа (аль хэдийн илгээсэн байж магадгүй).');
        } else {
            setSearchResults(r => r.filter(u => u.user_id !== targetUserId));
            await fetchFriendships();
        }
    };

    const acceptRequest = async (friendshipId) => {
        const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
        if (!error) await fetchFriendships();
    };

    const removeFriendship = async (friendshipId) => {
        const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
        if (!error) await fetchFriendships();
    };

    const handleChallenge = async (friendUserId) => {
        if (!challengeCategoryId) {
            await modal.alert('Эхлээд сэдэв сонгоно уу.');
            return;
        }
        setChallengingId(friendUserId);
        const { data: matchId, error } = await supabase.rpc('duel_challenge_friend', {
            p_friend_id: friendUserId,
            p_category_id: challengeCategoryId,
        });
        setChallengingId(null);
        if (error) {
            await modal.alert(error.message || 'Урихад алдаа гарлаа.');
            return;
        }
        const category = categories.find(c => c.id === challengeCategoryId);
        onChallengeCreated?.(matchId, challengeCategoryId, category?.name || '');
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Найзуудыг ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Найзуудыг ачаалахад алдаа гарлаа." onRetry={fetchFriendships} />;

    const incoming = friendships.filter(f => f.status === 'pending' && f.addressee_id === user.id);
    const outgoing = friendships.filter(f => f.status === 'pending' && f.requester_id === user.id);
    const accepted = friendships
        .filter(f => f.status === 'accepted')
        .map(f => {
            const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
            return { friendshipId: f.id, ...stats[otherId] };
        })
        .sort((a, b) => (b.total_floors_cleared || 0) - (a.total_floors_cleared || 0));

    const totalWins = history.filter(h => h.result === 'win').length;
    const totalLosses = history.filter(h => h.result === 'lose').length;
    const totalTies = history.filter(h => h.result === 'tie').length;

    return (
        <Card className="friends-page">
            <Button variant="ghost" onClick={onBack} className="friends-back">← Буцах</Button>
            <h2>👥 Найзууд ба Duel</h2>

            <form className="friends-search" onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Имэйл эсвэл nickname-ээр хайх..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
                <Button type="submit" disabled={searching}>{searching ? '...' : 'Хайх'}</Button>
            </form>

            {searchResults.length > 0 && (
                <div className="friends-section">
                    <h3>Хайлтын үр дүн</h3>
                    {searchResults.map(r => (
                        <div key={r.user_id} className="friends-row">
                            <span>{r.display_name}</span>
                            <Button variant="success" onClick={() => sendRequest(r.user_id)}>Хүсэлт илгээх</Button>
                        </div>
                    ))}
                </div>
            )}

            {incoming.length > 0 && (
                <div className="friends-section">
                    <h3>Ирсэн хүсэлтүүд</h3>
                    {incoming.map(f => (
                        <div key={f.id} className="friends-row">
                            <span>{stats[f.requester_id]?.display_name || '...'}</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <Button variant="success" onClick={() => acceptRequest(f.id)}>Зөвшөөрөх</Button>
                                <Button variant="ghost" onClick={() => removeFriendship(f.id)}>Татгалзах</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {outgoing.length > 0 && (
                <div className="friends-section">
                    <h3>Илгээсэн хүсэлтүүд</h3>
                    {outgoing.map(f => (
                        <div key={f.id} className="friends-row">
                            <span>{stats[f.addressee_id]?.display_name || '...'}</span>
                            <Button variant="ghost" onClick={() => removeFriendship(f.id)}>Цуцлах</Button>
                        </div>
                    ))}
                </div>
            )}

            <div className="friends-section">
                <h3>Миний найзууд ({accepted.length})</h3>
                {accepted.length > 0 && categories.length > 0 && (
                    <select
                        className="friends-challenge-category"
                        value={challengeCategoryId}
                        onChange={(e) => setChallengeCategoryId(e.target.value)}
                    >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}
                {accepted.length === 0 ? (
                    <p className="friends-empty">Одоогоор найз алга. Дээрээс имэйлээр хайж нэмнэ үү.</p>
                ) : (
                    accepted.map(f => {
                        const rec = duelRecordByName[f.display_name];
                        return (
                            <div key={f.friendshipId} className="friends-row">
                                <div className="friends-row-main">
                                    <span>{f.display_name}</span>
                                    <span className="friends-score">{f.total_floors_cleared || 0} давхар</span>
                                    {rec && (
                                        <span className="friends-duel-record">
                                            ⚔️ {rec.wins}Я / {rec.losses}Я / {rec.ties}Т
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <Button
                                        variant="success"
                                        onClick={() => handleChallenge(f.user_id)}
                                        disabled={challengingId === f.user_id || !challengeCategoryId}
                                    >
                                        ⚔️ Урих
                                    </Button>
                                    <Button variant="ghost" onClick={() => removeFriendship(f.friendshipId)}>Хасах</Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="friends-section">
                <h3>Дуэлийн түүх</h3>
                {historyLoading ? (
                    <p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>
                ) : historyError ? (
                    <ErrorState message="Дуэлийн түүхийг ачаалахад алдаа гарлаа." onRetry={fetchHistory} />
                ) : history.length === 0 ? (
                    <p className="friends-empty">Та хараахан дуэл хийгээгүй байна.</p>
                ) : (
                    <>
                        <p className="duel-history-summary">{totalWins} ялалт · {totalLosses} ялагдал · {totalTies} тэнцээ</p>
                        <div className="duel-history-list">
                            {history.map(h => (
                                <Card key={h.match_id} className={`duel-history-row duel-history-${h.result}`}>
                                    <span className="duel-history-result">{RESULT_LABEL[h.result]}</span>
                                    <span className="duel-history-category">{h.category_name}</span>
                                    <span className="duel-history-opponent">vs {h.opponent_name || '—'}</span>
                                    <span className="duel-history-score">{h.my_score} : {h.opponent_score}</span>
                                    <span className="duel-history-date">{new Date(h.played_at).toLocaleDateString('mn-MN')}</span>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Card>
    );
}

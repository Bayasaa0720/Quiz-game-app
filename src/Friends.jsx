import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { useModal } from './components/modalContext.js';
import './Friends.css';

export default function Friends({ user, onBack }) {
    const [friendships, setFriendships] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const modal = useModal();

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

    return (
        <Card className="friends-page">
            <Button variant="ghost" onClick={onBack} className="friends-back">← Буцах</Button>
            <h2>👥 Найзууд</h2>

            <form className="friends-search" onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Имэйлээр хайх..."
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
                {accepted.length === 0 ? (
                    <p className="friends-empty">Одоогоор найз алга. Дээрээс имэйлээр хайж нэмнэ үү.</p>
                ) : (
                    accepted.map(f => (
                        <div key={f.friendshipId} className="friends-row">
                            <span>{f.display_name}</span>
                            <span className="friends-score">{f.total_floors_cleared || 0} давхар</span>
                            <Button variant="ghost" onClick={() => removeFriendship(f.friendshipId)}>Хасах</Button>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
}

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import { useModal } from './components/modalContext.js';
import { formatCoin } from './lib/formatCoin.js';
import './Profile.css';

export default function Profile({
    user,
    userRole,
    onBack,
    onOpenAchievements,
    onOpenLeaderboard,
    onOpenFriends,
    onOpenDuelHistory,
    onOpenInventory,
    onOpenShop,
    onOpenClassrooms,
    onOpenAdminDashboard,
}) {
    const [balance, setBalance] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);
    const modal = useModal();

    useEffect(() => {
        supabase.from('user_points').select('balance').eq('user_id', user.id).maybeSingle().then(({ data }) => {
            setBalance(data?.balance || 0);
        });
        supabase.rpc('is_app_admin').then(({ data, error }) => {
            if (!error) setIsAdmin(!!data);
        });
    }, [user.id]);

    const handleJoinClassroom = async () => {
        const code = await modal.prompt('Багшийн код оруулна уу:', '', { title: 'Ангид нэгдэх' });
        if (!code || !code.trim()) return;
        const { data, error } = await supabase.rpc('join_classroom', { p_invite_code: code.trim() });
        if (error) {
            await modal.alert('Буруу код байна. Багшаасаа шалгаарай.');
            return;
        }
        await modal.alert(`"${data?.[0]?.classroom_name || ''}" ангид амжилттай нэгдлээ!`);
    };

    return (
        <div className="profile-page">
            <Button variant="ghost" onClick={onBack} className="profile-back">← Цамхаг сонгох руу</Button>
            <h2>👤 Миний профайл</h2>
            <p className="profile-email">{user?.email}</p>
            <p className="profile-coin">🪙 {formatCoin(balance)} coin</p>

            <div className="profile-tile-grid">
                <Card className="profile-tile" onClick={onOpenAchievements}>
                    <span className="profile-tile-icon" aria-hidden="true">🏆</span>
                    <span>Тэмдэгтүүд</span>
                </Card>
                <Card className="profile-tile" onClick={onOpenLeaderboard}>
                    <span className="profile-tile-icon" aria-hidden="true">📊</span>
                    <span>Тэргүүлэгчид</span>
                </Card>
                <Card className="profile-tile" onClick={onOpenFriends}>
                    <span className="profile-tile-icon" aria-hidden="true">👥</span>
                    <span>Найзууд</span>
                </Card>
                <Card className="profile-tile" onClick={onOpenDuelHistory}>
                    <span className="profile-tile-icon" aria-hidden="true">📜</span>
                    <span>Дуэлийн түүх</span>
                </Card>
                <Card className="profile-tile" onClick={onOpenInventory}>
                    <span className="profile-tile-icon" aria-hidden="true">🎒</span>
                    <span>Инвентар</span>
                </Card>
                <Card className="profile-tile" onClick={onOpenShop}>
                    <span className="profile-tile-icon" aria-hidden="true">🛒</span>
                    <span>Дэлгүүр</span>
                </Card>

                {userRole === 'teacher' && (
                    <Card className="profile-tile" onClick={onOpenClassrooms}>
                        <span className="profile-tile-icon" aria-hidden="true">🏫</span>
                        <span>Миний ангиуд</span>
                    </Card>
                )}

                {userRole === 'student' && (
                    <Card className="profile-tile" onClick={handleJoinClassroom}>
                        <span className="profile-tile-icon" aria-hidden="true">🎓</span>
                        <span>Ангид нэгдэх</span>
                    </Card>
                )}

                {isAdmin && (
                    <Card className="profile-tile profile-tile-admin" onClick={onOpenAdminDashboard}>
                        <span className="profile-tile-icon" aria-hidden="true">🛠</span>
                        <span>Admin</span>
                    </Card>
                )}
            </div>
        </div>
    );
}

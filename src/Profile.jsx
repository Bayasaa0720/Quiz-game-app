import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { useModal } from './components/modalContext.js';
import { useToast } from './components/toastContext.js';
import { ACHIEVEMENTS } from './lib/achievements.js';
import { formatCoin } from './lib/formatCoin.js';
import './Profile.css';

const ROLE_LABEL = { teacher: 'Багш', student: 'Хэрэглэгч' };

export default function Profile({ user, userRole, onBack, onLogout, onProfileUpdated }) {
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [balance, setBalance] = useState(0);
    const [earnedIds, setEarnedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [savingName, setSavingName] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);
    const modal = useModal();
    const { showToast } = useToast();

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const [{ data: profile, error: profileErr }, { data: pts }, { data: earned, error: earnedErr }] = await Promise.all([
                supabase.from('user_profiles').select('display_name, avatar_url').eq('user_id', user.id).maybeSingle(),
                supabase.from('user_points').select('balance').eq('user_id', user.id).maybeSingle(),
                supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id),
            ]);
            if (profileErr || earnedErr) throw profileErr || earnedErr;
            setDisplayName(profile?.display_name || '');
            setAvatarUrl(profile?.avatar_url || null);
            setBalance(pts?.balance || 0);
            setEarnedIds(new Set((earned || []).map(r => r.achievement_id)));
        } catch (err) {
            console.error('Error loading profile:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleSaveName = async () => {
        setSavingName(true);
        const { error } = await supabase.rpc('update_my_profile', {
            p_display_name: displayName.trim() || null,
            p_avatar_url: avatarUrl,
        });
        setSavingName(false);
        if (error) {
            await modal.alert('Нэр хадгалахад алдаа гарлаа.');
            return;
        }
        showToast({ icon: '✓', title: 'Хадгалагдлаа' });
        onProfileUpdated?.({ displayName: displayName.trim() || null, avatarUrl });
    };

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            await modal.alert('Зөвхөн зурган файл (jpg, png гэх мэт) сонгоно уу.');
            return;
        }

        setUploadingAvatar(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `${user.id}/${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
            if (uploadErr) throw uploadErr;

            const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
            const newUrl = pub.publicUrl;

            const { error: rpcErr } = await supabase.rpc('update_my_profile', {
                p_display_name: displayName.trim() || null,
                p_avatar_url: newUrl,
            });
            if (rpcErr) throw rpcErr;

            setAvatarUrl(newUrl);
            onProfileUpdated?.({ displayName: displayName.trim() || null, avatarUrl: newUrl });
            showToast({ icon: '✓', title: 'Зураг шинэчлэгдлээ' });
        } catch (err) {
            console.error('Error uploading avatar:', err);
            await modal.alert('Зураг оруулахад алдаа гарлаа.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Профайл ачаалахад алдаа гарлаа." onRetry={fetchProfile} />;

    const earnedCount = ACHIEVEMENTS.filter(a => earnedIds.has(a.id)).length;

    return (
        <div className="profile-page">
            <Button variant="ghost" onClick={onBack} className="profile-back">← Цамхаг сонгох руу</Button>

            <div className="profile-identity">
                <button type="button" className="profile-avatar-btn" onClick={handleAvatarClick} disabled={uploadingAvatar} title="Зураг солих">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Профайл зураг" className="profile-avatar-img" />
                    ) : (
                        <span className="profile-avatar-placeholder">{(displayName || user?.email || '?').charAt(0).toUpperCase()}</span>
                    )}
                    <span className="profile-avatar-edit-badge">{uploadingAvatar ? '…' : '✎'}</span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />

                <div className="profile-name-row">
                    <input
                        type="text"
                        placeholder="Харагдах нэр..."
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="profile-name-input"
                    />
                    <Button variant="ghost" onClick={handleSaveName} disabled={savingName}>Хадгалах</Button>
                </div>
                <p className="profile-email">{user?.email}</p>
                <p className="profile-role-badge">{ROLE_LABEL[userRole] || userRole}</p>
                <p className="profile-coin">🪙 {formatCoin(balance)} coin</p>
            </div>

            <h3 className="profile-section-title">🏆 Тэмдэгтүүд ({earnedCount} / {ACHIEVEMENTS.length})</h3>
            <div className="achievements-grid">
                {ACHIEVEMENTS.map(a => {
                    const earned = earnedIds.has(a.id);
                    return (
                        <Card key={a.id} className={`achievement-card${earned ? ' earned' : ' locked'}`}>
                            <span className="achievement-card-icon" aria-hidden="true">{earned ? a.icon : '🔒'}</span>
                            <h3>{a.name}</h3>
                            <p className="achievement-card-desc">{a.description}</p>
                            <span className="achievement-card-coin">🪙 {formatCoin(a.coin)}</span>
                            {earned && <span className="achievement-card-earned-tag">✓ Нээгдсэн</span>}
                        </Card>
                    );
                })}
            </div>

            <Button variant="danger" onClick={onLogout} className="profile-logout">Гарах</Button>
        </div>
    );
}

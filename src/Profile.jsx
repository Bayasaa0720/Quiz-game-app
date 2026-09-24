import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { useModal } from './components/modalContext.js';
import { useToast } from './components/toastContext.js';
import { ACHIEVEMENTS } from './lib/achievements.js';
import { formatCoin } from './lib/formatCoin.js';
import { isReduceAnimations, setReduceAnimations, isKeyboardShortcutsEnabled, setKeyboardShortcutsEnabled } from './lib/prefs.js';
import './Profile.css';

const ROLE_LABEL = { teacher: 'Багш', student: 'Хэрэглэгч' };

function ToggleSwitch({ on, onChange, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            className={`toggle-switch${on ? ' on' : ''}`}
            onClick={() => onChange(!on)}
        />
    );
}

export default function Profile({ user, userRole, onBack, onLogout, onProfileUpdated, sfxMuted, onToggleMute }) {
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [balance, setBalance] = useState(0);
    const [earnedIds, setEarnedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [savingName, setSavingName] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [reduceAnim, setReduceAnim] = useState(isReduceAnimations());
    const [kbShortcuts, setKbShortcuts] = useState(isKeyboardShortcutsEnabled());
    const [duelInvitePermission, setDuelInvitePermission] = useState('everyone');
    const [savingDuelPermission, setSavingDuelPermission] = useState(false);
    const fileInputRef = useRef(null);
    const modal = useModal();
    const { showToast } = useToast();

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const [{ data: profile, error: profileErr }, { data: pts }, { data: earned, error: earnedErr }] = await Promise.all([
                supabase.from('user_profiles').select('display_name, avatar_url, duel_invite_permission').eq('user_id', user.id).maybeSingle(),
                supabase.from('user_points').select('balance').eq('user_id', user.id).maybeSingle(),
                supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id),
            ]);
            if (profileErr || earnedErr) throw profileErr || earnedErr;
            setDisplayName(profile?.display_name || '');
            setAvatarUrl(profile?.avatar_url || null);
            setDuelInvitePermission(profile?.duel_invite_permission || 'everyone');
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

    const handleToggleReduceAnim = (value) => {
        setReduceAnim(value);
        setReduceAnimations(value);
    };

    const handleToggleKbShortcuts = (value) => {
        setKbShortcuts(value);
        setKeyboardShortcutsEnabled(value);
    };

    const handleChangeDuelPermission = async (value) => {
        if (value === duelInvitePermission) return;
        const prev = duelInvitePermission;
        setDuelInvitePermission(value);
        setSavingDuelPermission(true);
        const { error } = await supabase.rpc('update_duel_invite_permission', { p_permission: value });
        setSavingDuelPermission(false);
        if (error) {
            setDuelInvitePermission(prev);
            await modal.alert('Тохиргоо хадгалахад алдаа гарлаа.');
        }
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

            <div className="profile-settings">
                <h3 className="profile-section-title profile-settings-title">⚙️ Тохиргоо</h3>

                <div className="setting-row">
                    <div className="setting-row-text">
                        <span className="setting-row-label">Дуу</span>
                        <span className="setting-row-hint">Зөв/буруу хариултын эффект</span>
                    </div>
                    <ToggleSwitch on={!sfxMuted} onChange={() => onToggleMute?.()} label="Дуу" />
                </div>

                <div className="setting-row">
                    <div className="setting-row-text">
                        <span className="setting-row-label">Анимаци багасгах</span>
                        <span className="setting-row-hint">Шилжилтийн хөдөлгөөнийг хасна</span>
                    </div>
                    <ToggleSwitch on={reduceAnim} onChange={handleToggleReduceAnim} label="Анимаци багасгах" />
                </div>

                <div className="setting-row">
                    <div className="setting-row-text">
                        <span className="setting-row-label">Гарын товчлол</span>
                        <span className="setting-row-hint">Тулаанд 1-4 хариулт, Enter дараах</span>
                    </div>
                    <ToggleSwitch on={kbShortcuts} onChange={handleToggleKbShortcuts} label="Гарын товчлол" />
                </div>

                <div className="setting-row">
                    <div className="setting-row-text">
                        <span className="setting-row-label">Хэл</span>
                        <span className="setting-row-hint">Одоогоор зөвхөн монгол хэл дэмжигдэнэ</span>
                    </div>
                    <select className="setting-select" value="mn" disabled>
                        <option value="mn">Монгол</option>
                    </select>
                </div>

                <div className="setting-row">
                    <div className="setting-row-text">
                        <span className="setting-row-label">Дуэлийн урилга</span>
                        <span className="setting-row-hint">Хэн намайг нээлттэй хайлтаар олох боломжтой</span>
                    </div>
                    <div className="setting-radio-group">
                        <button
                            type="button"
                            className={duelInvitePermission === 'friends' ? 'active' : ''}
                            disabled={savingDuelPermission}
                            onClick={() => handleChangeDuelPermission('friends')}
                        >
                            Найзууд
                        </button>
                        <button
                            type="button"
                            className={duelInvitePermission === 'everyone' ? 'active' : ''}
                            disabled={savingDuelPermission}
                            onClick={() => handleChangeDuelPermission('everyone')}
                        >
                            Бүгд
                        </button>
                    </div>
                </div>
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

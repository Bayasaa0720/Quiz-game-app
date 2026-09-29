import { useState } from 'react';
import { supabase } from './supabaseClient.jsx';
import Button from './components/Button.jsx';
import { useModal } from './components/modalContext.js';
import './AuthForm.css';

// Tower Climb App.html deck-ийн 3-р алхамын нэгдсэн auth card — хуучин
// Login.jsx + register.jsx-ийг орлоно (эдгээр нь Онбоардингоос гадуур
// хэзээ ч ашиглагдаагүй тул нэгтгэхэд аюулгүй). Нэвтрэх/Бүртгүүлэх
// pill-tab нэг card дотор, "Та хэн бэ?" сонголт card хэлбэртэй.
export default function AuthForm({ onAuthSuccess }) {
    const [mode, setMode] = useState('register'); // 'login' | 'register'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [loading, setLoading] = useState(false);
    const modal = useModal();

    const handleGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) await modal.alert(error.message, { title: 'Google-ээр нэвтрэх амжилтгүй' });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                await modal.alert(error.message, { title: 'Нэвтрэх амжилтгүй' });
                return;
            }
            onAuthSuccess(data.user);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Role болон нэрийг user_metadata-аар дамжуулна — имэйл
            // баталгаажуулаагүй (session байхгүй) үед ч алдагдахгүй, анх
            // нэвтрэх үед user_profiles мөр болж бэхжинэ (App.jsx харна уу).
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { role, display_name: name.trim() || null } },
            });
            if (error) {
                await modal.alert(error.message, { title: 'Бүртгэл амжилтгүй' });
                return;
            }
            if (!data.session) {
                await modal.alert('Акаунт үүслээ! Нэвтрэхээсээ өмнө имэйлээ шалгаж баталгаажуулна уу.', { title: 'Амжилттай' });
                setMode('login');
            } else {
                onAuthSuccess(data.user);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-card">
            <h2>{mode === 'register' ? 'Бүртгэл үүсгэх' : 'Нэвтрэх'}</h2>
            <p className="auth-card-sub">
                {mode === 'register' ? 'Сурагч эсвэл багш эсхээ сонгоод бүртгүүлээрэй.' : 'Имэйл, нууц үгээрээ нэвтэрнэ үү.'}
            </p>

            <div className="auth-tabs">
                <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Нэвтрэх</button>
                <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Бүртгүүлэх</button>
            </div>

            {mode === 'register' ? (
                <form onSubmit={handleRegister} className="auth-form">
                    <div>
                        <label className="auth-field-label">Та хэн бэ?</label>
                        <div className="auth-role-cards">
                            <button type="button" className={`auth-role-card${role === 'student' ? ' active' : ''}`} onClick={() => setRole('student')}>
                                <span className="auth-role-icon">🎮</span>
                                <span className="auth-role-title">Сурагч</span>
                                <span className="auth-role-desc">Цамхаг ахиулж, найзтайгаа өрсөлдөнө</span>
                            </button>
                            <button type="button" className={`auth-role-card${role === 'teacher' ? ' active' : ''}`} onClick={() => setRole('teacher')}>
                                <span className="auth-role-icon">🏫</span>
                                <span className="auth-role-title">Багш</span>
                                <span className="auth-role-desc">Анги үүсгэж, даалгавар өгнө</span>
                            </button>
                        </div>
                    </div>

                    <label className="auth-field-label">Нэр</label>
                    <input type="text" placeholder="Таны нэр" value={name} onChange={e => setName(e.target.value)} />

                    <label className="auth-field-label">Имэйл</label>
                    <input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />

                    <label className="auth-field-label">Нууц үг</label>
                    <input type="password" placeholder="Доор хааж 6 тэмдэгт" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />

                    <Button type="submit" disabled={loading} fullWidth>
                        {loading ? 'Үүсгэж байна...' : 'Бүртгүүлэх →'}
                    </Button>
                </form>
            ) : (
                <form onSubmit={handleLogin} className="auth-form">
                    <label className="auth-field-label">Имэйл</label>
                    <input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />

                    <label className="auth-field-label">Нууц үг</label>
                    <input type="password" placeholder="Нууц үг" value={password} onChange={e => setPassword(e.target.value)} required />

                    <Button type="submit" disabled={loading} fullWidth>
                        {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх →'}
                    </Button>
                </form>
            )}

            <div className="auth-divider"><span>эсвэл</span></div>

            <button type="button" className="auth-google-btn" onClick={handleGoogle}>
                <span aria-hidden="true">G</span> Google-ээр үргэлжлүүлэх
            </button>

            <p className="auth-switch">
                {mode === 'register' ? (
                    <>Бүртгэлтэй юу? <button type="button" className="auth-switch-btn" onClick={() => setMode('login')}>Нэвтрэх</button></>
                ) : (
                    <>Акаунт байхгүй юу? <button type="button" className="auth-switch-btn" onClick={() => setMode('register')}>Бүртгүүлнэ үү</button></>
                )}
            </p>
        </div>
    );
}

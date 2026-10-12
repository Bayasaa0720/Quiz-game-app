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
        if (error) await modal.alert(error.message, { title: 'Google sign-in failed' });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                await modal.alert(error.message, { title: 'Login failed' });
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
                await modal.alert(error.message, { title: 'Registration failed' });
                return;
            }
            if (!data.session) {
                await modal.alert('Account created! Please check your email to verify it before logging in.', { title: 'Success' });
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
            <h2>{mode === 'register' ? 'Create account' : 'Log in'}</h2>
            <p className="auth-card-sub">
                {mode === 'register' ? 'Choose student or teacher and sign up.' : 'Log in with your email and password.'}
            </p>

            <div className="auth-tabs">
                <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Log in</button>
                <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
            </div>

            {mode === 'register' ? (
                <form onSubmit={handleRegister} className="auth-form">
                    <div>
                        <label className="auth-field-label">Who are you?</label>
                        <div className="auth-role-cards">
                            <button type="button" className={`auth-role-card${role === 'student' ? ' active' : ''}`} onClick={() => setRole('student')}>
                                <span className="auth-role-icon">🎮</span>
                                <span className="auth-role-title">Student</span>
                                <span className="auth-role-desc">Climb towers and compete with friends</span>
                            </button>
                            <button type="button" className={`auth-role-card${role === 'teacher' ? ' active' : ''}`} onClick={() => setRole('teacher')}>
                                <span className="auth-role-icon">🏫</span>
                                <span className="auth-role-title">Teacher</span>
                                <span className="auth-role-desc">Create classes and assign work</span>
                            </button>
                        </div>
                    </div>

                    <label className="auth-field-label">Name</label>
                    <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />

                    <label className="auth-field-label">Email</label>
                    <input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />

                    <label className="auth-field-label">Password</label>
                    <input type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />

                    <Button type="submit" disabled={loading} fullWidth>
                        {loading ? 'Creating...' : 'Register →'}
                    </Button>
                </form>
            ) : (
                <form onSubmit={handleLogin} className="auth-form">
                    <label className="auth-field-label">Email</label>
                    <input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />

                    <label className="auth-field-label">Password</label>
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />

                    <Button type="submit" disabled={loading} fullWidth>
                        {loading ? 'Logging in...' : 'Log in →'}
                    </Button>
                </form>
            )}

            <div className="auth-divider"><span>or</span></div>

            <button type="button" className="auth-google-btn" onClick={handleGoogle}>
                <span aria-hidden="true">G</span> Continue with Google
            </button>

            <p className="auth-switch">
                {mode === 'register' ? (
                    <>Already have an account? <button type="button" className="auth-switch-btn" onClick={() => setMode('login')}>Log in</button></>
                ) : (
                    <>Don't have an account? <button type="button" className="auth-switch-btn" onClick={() => setMode('register')}>Register</button></>
                )}
            </p>
        </div>
    );
}

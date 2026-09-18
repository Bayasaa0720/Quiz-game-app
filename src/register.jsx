import { useState } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import { useModal } from './components/modalContext.js';
import './AuthForm.css';

export default function Register({ onRegistrationSuccess, onSwitchToLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [loading, setLoading] = useState(false);
    const modal = useModal();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Role-г user_metadata-аар дамжуулж хадгална — имэйл баталгаажуулаагүй
            // (session байхгүй) үед ч алдагдахгүй, анх нэвтрэх үед user_profiles
            // мөр болж бэхжинэ (App.jsx-ийн ensureUserProfile харна уу).
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { role } },
            });
            if (error) {
                await modal.alert(error.message, { title: 'Бүртгэл амжилтгүй' });
                return;
            }
            if (!data.session) {
                await modal.alert('Акаунт үүслээ! Нэвтрэхээсээ өмнө имэйлээ шалгаж баталгаажуулна уу.', { title: 'Амжилттай' });
                onRegistrationSuccess(null);
            } else {
                await modal.alert('Акаунт амжилттай үүслээ!', { title: 'Амжилттай' });
                onRegistrationSuccess(data.user);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="auth-page">
            <h2>Акаунт үүсгэх</h2>
            <form onSubmit={handleRegister} className="auth-form">
                <input type="email" placeholder="Имэйл" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" placeholder="Нууц үг" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />

                <div className="auth-role-select">
                    <label className={role === 'student' ? 'active' : ''}>
                        <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} />
                        🎮 Хэрэглэгч
                    </label>
                    <label className={role === 'teacher' ? 'active' : ''}>
                        <input type="radio" name="role" value="teacher" checked={role === 'teacher'} onChange={() => setRole('teacher')} />
                        🏫 Багш
                    </label>
                </div>
                <p className="auth-role-hint">
                    {role === 'teacher'
                        ? 'Багш эрхээр анги үүсгэж, сурагчдынхаа явцыг хянах боломжтой болно.'
                        : 'Ердийн хэрэглэгчээр тоглож, багшийн код ашиглан ангид нэгдэх боломжтой.'}
                    {' '}Энэ сонголтыг дараа солих боломжгүй.
                </p>

                <Button variant="success" type="submit" disabled={loading} fullWidth>
                    {loading ? 'Үүсгэж байна...' : 'Бүртгүүлэх'}
                </Button>
            </form>
            <p className="auth-switch">
                Акаунт байгаа юу? <button type="button" className="auth-switch-btn" onClick={onSwitchToLogin}>Энд нэвтэрнэ үү</button>
            </p>
        </Card>
    );
}

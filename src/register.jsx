import { useState } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import { useModal } from './components/modalContext.js';
import './AuthForm.css';

export default function Register({ onRegistrationSuccess, onSwitchToLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const modal = useModal();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({ email, password });
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
                <Button variant="success" type="submit" disabled={loading} fullWidth>
                    {loading ? 'Үүсгэж байна...' : 'Бүртгүүлэх'}
                </Button>
            </form>
            <p className="auth-switch">
                Акаунт байгаа юу? <span onClick={onSwitchToLogin}>Энд нэвтэрнэ үү</span>
            </p>
        </Card>
    );
}

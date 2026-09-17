import { useState } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import { useModal } from './components/modalContext.js';
import './AuthForm.css';

export default function Login({ onLoginSuccess, onSwitchToRegister }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const modal = useModal();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                await modal.alert(error.message, { title: 'Нэвтрэх амжилтгүй' });
                return;
            }
            onLoginSuccess(data.user);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="auth-page">
            <h2>Нэвтрэх</h2>
            <form onSubmit={handleLogin} className="auth-form">
                <input type="email" placeholder="Имэйл" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" placeholder="Нууц үг" value={password} onChange={e => setPassword(e.target.value)} required />
                <Button type="submit" disabled={loading} fullWidth>
                    {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
                </Button>
            </form>
            <p className="auth-switch">
                Акаунт байхгүй юу? <button type="button" className="auth-switch-btn" onClick={onSwitchToRegister}>Энд бүртгүүлнэ үү</button>
            </p>
        </Card>
    );
}

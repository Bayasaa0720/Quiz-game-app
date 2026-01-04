import { useState } from 'react';
import sql from './db.jsx'; //

export default function Login({ onLoginSuccess, onSwitchToRegister }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const user = await sql`
                SELECT * FROM users 
                WHERE username = ${username} AND password = ${password}
            `;
            if (user.length > 0) {
                onLoginSuccess(user[0]);
            } else {
                alert("Invalid username or password");
            }
        } catch (err) {
            console.error(err);
            alert("Login failed. Check your database connection.");
        }
    };

    return (
        <div style={{ maxWidth: '300px', margin: '50px auto', textAlign: 'center' }}>
            <h2>Login</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit" style={{ backgroundColor: '#007bff', color: 'white', padding: '10px', border: 'none', borderRadius: '5px' }}>Log In</button>
            </form>
            <p style={{ marginTop: '15px' }}>
                Need an account? <span onClick={onSwitchToRegister} style={{ color: 'blue', cursor: 'pointer' }}>Register here</span>
            </p>
        </div>
    );
}
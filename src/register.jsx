import { useState } from 'react';
import sql from './db.jsx'; //

export default function Register({ onRegistrationSuccess, onSwitchToLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await sql`
                INSERT INTO users (username, password) 
                VALUES (${username}, ${password})
            `;
            alert("Account created successfully!");
            onRegistrationSuccess();
        } catch (err) {
            console.error(err);
            alert("Username already exists or database error.");
        }
    };

    return (
        <div style={{ maxWidth: '300px', margin: '50px auto', textAlign: 'center' }}>
            <h2>Create Account</h2>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit" style={{ backgroundColor: '#28a745', color: 'white', padding: '10px', border: 'none', borderRadius: '5px' }}>Sign Up</button>
            </form>
            <p style={{ marginTop: '15px' }}>
                Already have an account? <span onClick={onSwitchToLogin} style={{ color: 'blue', cursor: 'pointer' }}>Login here</span>
            </p>
        </div>
    );
}
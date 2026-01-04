import { useState } from 'react';
import sql from './db.jsx'; // Your Neon connection

export default function Auth({ onLoginSuccess }) {
    const [isRegistering, setIsRegistering] = useState(false); // Toggle state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isRegistering) {
                // REGISTER logic
                await sql`INSERT INTO users (username, password) VALUES (${username}, ${password})`;
                alert("Account created! You can now log in.");
                setIsRegistering(false); // Switch back to login
            } else {
                // LOGIN logic
                const user = await sql`SELECT * FROM users WHERE username = ${username} AND password = ${password}`;
                if (user.length > 0) {
                    onLoginSuccess(user[0]); // Send user data to App.jsx
                } else {
                    alert("Invalid username or password");
                }
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred. Username might already exist.");
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
            <h2>{isRegistering ? 'Create Account' : 'Login'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                    placeholder="Username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                />
                <button type="submit" style={{ backgroundColor: '#007bff', color: 'white', padding: '10px' }}>
                    {isRegistering ? 'Sign Up' : 'Log In'}
                </button>
            </form>
            <p onClick={() => setIsRegistering(!isRegistering)} style={{ cursor: 'pointer', color: 'blue', marginTop: '15px' }}>
                {isRegistering ? 'Already have an account? Log in' : 'New user? Create an account'}
            </p>
        </div>
    );
}
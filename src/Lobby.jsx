import { useState, useEffect } from 'react';
import sql from './db.jsx'; 

const buttonStyle = {
    padding: '10px 15px',
    margin: '5px',
    fontSize: '1em',
    borderRadius: '5px',
    cursor: 'pointer',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
};

export default function Lobby({ 
    user, // Receive the user object from App.jsx
    onLogout, 
    onStartQuiz, 
    onCreateQuestion,
    onManageQuestions 
}) {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            if (!user) return; // Wait until user is loaded
            setLoading(true);
            try {
                // IMPORTANT: Only fetch categories belonging to this user
                const data = await sql`
                    SELECT id, name 
                    FROM categories 
                    WHERE user_id = ${user.id}
                    ORDER BY name ASC
                `;
                setCategories(data || []);
            } catch (error) {
                console.error('Error fetching categories from Neon:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, [user]); // Re-run if user changes

    const handleCategorySelect = (e) => {
        const categoryId = e.target.value;
        setSelectedCategory(categoryId ? categoryId : null);
    };

    const handleStartQuiz = () => {
        if (selectedCategory) {
            onStartQuiz(selectedCategory);
        } else {
            alert('Did you choose the category you want to play? Please select one first.');
        }
    };
    
    const handleManageQuestions = () => {
        if (selectedCategory) {
            onManageQuestions(selectedCategory);
        } else {
            alert('Did you choose the category you want to edit? Please select one first.');
        }
    };

    if (loading) {
        return <p>Loading your personal categories...</p>;
    }

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center', padding: '20px' }}>
            <h1 style={{ color: '#fff' }}>Welcome, {user?.username}!</h1>
            <p style={{ color: '#ccc' }}>Select one of your categories:</p>

            <select 
                onChange={handleCategorySelect} 
                value={selectedCategory || ''}
                style={{ padding: '10px', fontSize: '1em', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '5px', width: '280px', textAlign: 'center' }}
            >
                <option value="">-- Select a Category --</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                        {cat.name}
                    </option>
                ))}
            </select>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                <button onClick={handleStartQuiz} style={{ ...buttonStyle, backgroundColor: '#007bff', width: '280px'}}>
                    Start Quiz
                </button>

                <button onClick={onCreateQuestion} style={{ ...buttonStyle, backgroundColor: '#28a745', width: '280px' }}>
                    Create New Question
                </button>
                
                <button onClick={handleManageQuestions} style={{ ...buttonStyle, backgroundColor: '#FFC107', width: '280px' }}>
                    Manage Questions (Edit/Delete)
                </button>

                <button onClick={onLogout} style={{ ...buttonStyle, backgroundColor: '#dc3545', marginTop: '30px' }}>
                    Log Out
                </button>
            </div>
        </div>
    );
}
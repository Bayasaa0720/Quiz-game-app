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
            setLoading(true);
            try {
                const data = await sql`
                    SELECT id, name 
                    FROM categories 
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
    }, []);

    const handleCategorySelect = (e) => {
        const categoryId = e.target.value;
        setSelectedCategory(categoryId ? categoryId : null);
    };

    const handleStartQuiz = () => {
        if (selectedCategory) {
            onStartQuiz(selectedCategory);
        } else {
            // Updated message for Start button
            alert('Did you choose the category you want to play? Please select one first.');
        }
    };
    
    const handleManageQuestions = () => {
        if (selectedCategory) {
            onManageQuestions(selectedCategory);
        } else {
            // --- YOUR NEW MESSAGE HERE ---
            alert('Did you choose the category you want to edit? Please select one first.');
        }
    };

    if (loading) {
        return <p>Loading categories from database...</p>;
    }

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center', padding: '20px' }}>
            <h1 style={{ color: '#333' }}>Quiz Lobby</h1>
            <p style={{ color: '#555' }}>Ready to learn? Select a category:</p>

            <select 
                onChange={handleCategorySelect} 
                value={selectedCategory || ''}
                style={{ padding: '10px', fontSize: '1em', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '5px' }}
            >
                <option value="">-- Select a Category --</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                        {cat.name}
                    </option>
                ))}
            </select>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                <button
                    onClick={handleStartQuiz}
                    // REMOVED: disabled={!selectedCategory} so the button can be clicked to show the alert
                    style={{ ...buttonStyle, backgroundColor: '#007bff' }}
                >
                    Start Quiz
                </button>

                <button
                    onClick={onCreateQuestion}
                    style={{ ...buttonStyle, backgroundColor: '#28a745' }}
                >
                    Create New Question
                </button>
                
                <button
                    onClick={handleManageQuestions}
                    // REMOVED: disabled={!selectedCategory} so the button can be clicked to show the alert
                    style={{ ...buttonStyle, backgroundColor: '#FFC107' }}
                >
                    Manage Questions (Edit/Delete)
                </button>
            </div>

            {onLogout && (
                <button 
                    onClick={onLogout} 
                    style={{ ...buttonStyle, backgroundColor: '#dc3545', marginTop: '30px' }}
                >
                    Log Out
                </button>
            )}
        </div>
    );
}
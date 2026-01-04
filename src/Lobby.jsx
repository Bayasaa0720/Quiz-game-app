import { useState, useEffect } from 'react';
// 1. Import your Neon connection instead of Supabase
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
    onLogout, // Note: You might remove this if you aren't using Auth anymore
    onStartQuiz, 
    onCreateQuestion,
    onManageQuestions 
}) {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- Fetch Categories from Neon ---
    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                // 2. Use Neon SQL to fetch categories
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
            alert('Please select a category to start the quiz.');
        }
    };
    
    const handleManageQuestions = () => {
        if (selectedCategory) {
            onManageQuestions(selectedCategory);
        } else {
            alert('Please select a category to manage questions.');
        }
    };

    if (loading) {
        return <p>Loading categories from database...</p>;
    }

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center', padding: '20px' }}>
            <h1 style={{ color: '#333' }}>Quiz Lobby</h1>
            <p style={{ color: '#555' }}>Ready to learn? Select a category:</p>

            {/* Category Selector */}
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
                    disabled={!selectedCategory}
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
                    disabled={!selectedCategory}
                    style={{ ...buttonStyle, backgroundColor: '#FFC107' }}
                >
                    Manage Questions (Edit/Delete)
                </button>
            </div>

            {/* Logout is optional now since we bypassed Supabase Auth */}
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
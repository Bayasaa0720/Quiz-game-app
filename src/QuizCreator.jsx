import { useState, useEffect } from 'react';
import sql from './db.jsx'; 

export default function QuizCreator({ user, onDone }) {
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [questionText, setQuestionText] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    // Fetch ONLY this user's categories
    useEffect(() => {
        const fetchMyCategories = async () => {
            if (!user) return;
            try {
                const data = await sql`
                    SELECT id, name FROM categories 
                    WHERE user_id = ${user.id} 
                    ORDER BY name ASC
                `;
                setCategories(data);
            } catch (err) {
                console.error("Error fetching categories:", err);
            }
        };
        fetchMyCategories();
    }, [user]);

    const handleCreateQuestion = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let categoryId = selectedCategoryId;

            // Create new category if needed
            if (!categoryId && newCategoryName) {
                const [newCat] = await sql`
                    INSERT INTO categories (name, user_id) 
                    VALUES (${newCategoryName}, ${user.id}) 
                    RETURNING id
                `;
                categoryId = newCat.id;
            }

            if (!categoryId) {
                alert("Please select or create a category.");
                setLoading(false);
                return;
            }

            // Save the question (No wrong answers stored!)
            await sql`
                INSERT INTO questions (category_id, question_text, correct_answer)
                VALUES (${categoryId}, ${questionText}, ${correctAnswer})
            `;

            alert("Question saved! The game will use other answers as distractors.");
            onDone(); 
        } catch (error) {
            console.error("Error creating question:", error);
            alert("Failed to save.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto', color: 'white', padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
            <h2>Add New Question</h2>
            <form onSubmit={handleCreateQuestion}>
                
                <div style={{ marginBottom: '20px' }}>
                    <label>Category:</label>
                    <select 
                        value={selectedCategoryId} 
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        style={{ width: '100%', padding: '10px', marginTop: '5px' }}
                    >
                        <option value="">-- Create New Category --</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    {!selectedCategoryId && (
                        <input 
                            type="text" 
                            placeholder="New Category Name" 
                            value={newCategoryName} 
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            style={{ width: '100%', padding: '10px', marginTop: '10px' }}
                        />
                    )}
                </div>

                <div style={{ marginTop: '20px' }}>
                    <label>Question:</label>
                    <textarea 
                        value={questionText} 
                        onChange={(e) => setQuestionText(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', marginTop: '5px', height: '80px' }}
                    />
                </div>

                <div style={{ marginTop: '10px' }}>
                    <label style={{ color: '#28a745' }}>Correct Answer:</label>
                    <input 
                        type="text" 
                        value={correctAnswer} 
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', marginTop: '5px' }}
                    />
                </div>

                <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{ flex: 1, padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        {loading ? 'Saving...' : 'Save Question'}
                    </button>
                    <button 
                        type="button" 
                        onClick={onDone}
                        style={{ flex: 1, padding: '15px', backgroundColor: '#666', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
import { useState, useEffect } from 'react';
import sql from './db.jsx'; 

export default function QuizCreator({ user, onDone }) {
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [questionText, setQuestionText] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [wrongAnswers, setWrongAnswers] = useState(['', '', '']);
    const [loading, setLoading] = useState(false);

    // Fetch ONLY this user's categories for the dropdown
    useEffect(() => {
        const fetchMyCategories = async () => {
            if (!user) return;
            const data = await sql`
                SELECT id, name FROM categories 
                WHERE user_id = ${user.id} 
                ORDER BY name ASC
            `;
            setCategories(data);
        };
        fetchMyCategories();
    }, [user]);

    const handleCreateQuestion = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let categoryId = selectedCategoryId;

            // 1. If user typed a new category name, create it linked to their ID
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

            // 2. Insert the question linked to that category
            await sql`
                INSERT INTO questions (category_id, question_text, correct_answer, wrong_answers)
                VALUES (${categoryId}, ${questionText}, ${correctAnswer}, ${wrongAnswers})
            `;

            alert("Question created successfully!");
            onDone(); // Go back to lobby
        } catch (error) {
            console.error("Error creating question:", error);
            alert("Failed to save. Make sure all fields are filled.");
        } finally {
            setLoading(false);
        }
    };

    const handleWrongAnswerChange = (index, value) => {
        const newWrong = [...wrongAnswers];
        newWrong[index] = value;
        setWrongAnswers(newWrong);
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', color: 'white', padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
            <h2>Create New Quiz Content</h2>
            <form onSubmit={handleCreateQuestion}>
                
                {/* Category Selection */}
                <div style={{ marginBottom: '20px' }}>
                    <label>Choose Existing Category:</label>
                    <select 
                        value={selectedCategoryId} 
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        style={{ width: '100%', padding: '10px', marginTop: '5px' }}
                    >
                        <option value="">-- Or Create New Below --</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    <p style={{ margin: '10px 0' }}>- OR -</p>

                    <label>New Category Name:</label>
                    <input 
                        type="text" 
                        value={newCategoryName} 
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g., Science, History"
                        style={{ width: '100%', padding: '10px', marginTop: '5px' }}
                    />
                </div>

                <hr />

                {/* Question Details */}
                <div style={{ marginTop: '20px' }}>
                    <label>Question:</label>
                    <textarea 
                        value={questionText} 
                        onChange={(e) => setQuestionText(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', marginTop: '5px' }}
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

                {wrongAnswers.map((ans, i) => (
                    <div key={i} style={{ marginTop: '10px' }}>
                        <label style={{ color: '#dc3545' }}>Wrong Answer {i + 1}:</label>
                        <input 
                            type="text" 
                            value={ans} 
                            onChange={(e) => handleWrongAnswerChange(i, e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
                        />
                    </div>
                ))}

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
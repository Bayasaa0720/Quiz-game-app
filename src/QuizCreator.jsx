import { useState, useEffect } from 'react';
import sql from './db.jsx'; 

export default function QuizCreator({ user, onDone }) {
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [questionText, setQuestionText] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [imageUrl, setImageUrl] = useState(''); 
    const [loading, setLoading] = useState(false);

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

            // Handle duplicate category name logic
            if (!categoryId && newCategoryName) {
                const existing = await sql`
                    SELECT id FROM categories 
                    WHERE name = ${newCategoryName} AND user_id = ${user.id}
                `;

                if (existing.length > 0) {
                    categoryId = existing[0].id;
                } else {
                    const [newCat] = await sql`
                        INSERT INTO categories (name, user_id) 
                        VALUES (${newCategoryName}, ${user.id}) 
                        RETURNING id
                    `;
                    categoryId = newCat.id;
                }
            }

            if (!categoryId) {
                alert("Please select or create a category.");
                setLoading(false);
                return;
            }

            // Save question with optional image_url
            await sql`
                INSERT INTO questions (category_id, question_text, correct_answer, image_url)
                VALUES (${categoryId}, ${questionText}, ${correctAnswer}, ${imageUrl || null})
            `;

            alert("Question saved successfully!");
            onDone(); 
        } catch (error) {
            console.error("Error creating question:", error);
            alert("Failed to save. Check your connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto', color: 'white', padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
            <h2>Create Question</h2>
            <form onSubmit={handleCreateQuestion}>
                <div style={{ marginBottom: '15px' }}>
                    <label>Category:</label>
                    <select 
                        value={selectedCategoryId} 
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        style={{ width: '100%', padding: '10px', marginTop: '5px', color: 'black' }}
                    >
                        <option value="">-- New Category --</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    {!selectedCategoryId && (
                        <input 
                            type="text" 
                            placeholder="Category Name" 
                            value={newCategoryName} 
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            style={{ width: '100%', padding: '10px', marginTop: '10px', color: 'black' }}
                        />
                    )}
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label>Question Text:</label>
                    <textarea 
                        value={questionText} 
                        onChange={(e) => setQuestionText(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', marginTop: '5px', color: 'black' }}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label>Image URL (Optional):</label>
                    <input 
                        type="text" 
                        placeholder="Paste image link here" 
                        value={imageUrl} 
                        onChange={(e) => setImageUrl(e.target.value)}
                        style={{ width: '100%', padding: '10px', marginTop: '5px', color: 'black' }}
                    />
                    {imageUrl && (
                        <div style={{ marginTop: '10px' }}>
                            <p style={{ fontSize: '0.8em', color: '#aaa' }}>Preview:</p>
                            <img src={imageUrl} alt="preview" style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '5px' }} />
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ color: '#28a745' }}>Correct Answer:</label>
                    <input 
                        type="text" 
                        value={correctAnswer} 
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', marginTop: '5px', color: 'black' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={onDone} style={{ flex: 1, padding: '12px', backgroundColor: '#666', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
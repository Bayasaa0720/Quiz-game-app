import { useState, useEffect } from 'react';
import sql from './db.jsx'; 

export default function QuizCreator({ user, onDone }) {
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    
    // Question State
    const [questionText, setQuestionText] = useState('');
    const [isQuestionImage, setIsQuestionImage] = useState(false);
    
    // Answer State
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [isAnswerImage, setIsAnswerImage] = useState(false);
    
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

            // Save logic: If it's an image, we put it in the image column
            await sql`
                INSERT INTO questions (
                    category_id, 
                    question_text, 
                    image_url, 
                    correct_answer, 
                    answer_image_url
                )
                VALUES (
                    ${categoryId}, 
                    ${isQuestionImage ? 'Visual Question' : questionText}, 
                    ${isQuestionImage ? questionText : null}, 
                    ${isAnswerImage ? 'Visual Answer' : correctAnswer}, 
                    ${isAnswerImage ? correctAnswer : null}
                )
            `;

            alert("Question saved!");
            onDone(); 
        } catch (error) {
            console.error(error);
            alert("Failed to save.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto', color: 'white', padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
            <h2>Create Question</h2>
            <form onSubmit={handleCreateQuestion}>
                {/* Category Selection */}
                <div style={{ marginBottom: '15px' }}>
                    <label>Category:</label>
                    <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', color: 'black' }}>
                        <option value="">-- New Category --</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    {!selectedCategoryId && (
                        <input type="text" placeholder="Category Name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '10px', color: 'black' }} />
                    )}
                </div>

                {/* Question Section */}
                <div style={{ marginBottom: '15px', border: '1px solid #555', padding: '10px', borderRadius: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label>Question:</label>
                        <label style={{ fontSize: '0.8em' }}>
                            <input type="checkbox" checked={isQuestionImage} onChange={() => {setIsQuestionImage(!isQuestionImage); setQuestionText('');}} /> Is this an image?
                        </label>
                    </div>
                    <textarea 
                        value={questionText} 
                        onChange={(e) => setQuestionText(e.target.value)}
                        required
                        placeholder={isQuestionImage ? "Paste Image URL here..." : "Type your question here..."}
                        style={{ width: '100%', padding: '10px', marginTop: '5px', color: 'black' }}
                    />
                    {isQuestionImage && questionText && <img src={questionText} alt="Preview" style={{ width: '100%', marginTop: '10px', maxHeight: '100px', objectFit: 'contain' }} />}
                </div>

                {/* Answer Section */}
                <div style={{ marginBottom: '15px', border: '1px solid #555', padding: '10px', borderRadius: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label style={{ color: '#28a745' }}>Correct Answer:</label>
                        <label style={{ fontSize: '0.8em' }}>
                            <input type="checkbox" checked={isAnswerImage} onChange={() => {setIsAnswerImage(!isAnswerImage); setCorrectAnswer('');}} /> Is this an image?
                        </label>
                    </div>
                    <input 
                        type="text" 
                        value={correctAnswer} 
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        required
                        placeholder={isAnswerImage ? "Paste Image URL here..." : "Type the answer here..."}
                        style={{ width: '100%', padding: '10px', marginTop: '5px', color: 'black' }}
                    />
                    {isAnswerImage && correctAnswer && <img src={correctAnswer} alt="Preview" style={{ width: '100%', marginTop: '10px', maxHeight: '100px', objectFit: 'contain' }} />}
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
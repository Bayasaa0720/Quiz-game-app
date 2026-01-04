import { useState, useEffect } from 'react';
import sql from './db.jsx'; 

export default function QuizCreator({ user, onDone }) {
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    
    // Question State
    const [questionText, setQuestionText] = useState('');
    const [isQueImg, setIsQueImg] = useState(false);
    
    // Answer State
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [isAnsImg, setIsAnsImg] = useState(false);
    
    const [loading, setLoading] = useState(false);

    // Load only the categories owned by the logged-in user
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

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let catId = selectedCategoryId;

            // 1. Logic for New Category
            if (!catId && newCategoryName.trim()) {
                // Check if user already owns a category with this name to avoid duplicates
                const existing = await sql`
                    SELECT id FROM categories 
                    WHERE name = ${newCategoryName.trim()} AND user_id = ${user.id}
                `;

                if (existing.length > 0) {
                    catId = existing[0].id;
                } else {
                    const [newCat] = await sql`
                        INSERT INTO categories (name, user_id) 
                        VALUES (${newCategoryName.trim()}, ${user.id}) 
                        RETURNING id
                    `;
                    catId = newCat.id;
                }
            }

            if (!catId) {
                alert("Please select a category or type a new name.");
                setLoading(false);
                return;
            }

            // 2. Save the Question
            // We store the input in 'image_url' if the checkbox is checked, 
            // otherwise we store it in 'question_text'.
            await sql`
                INSERT INTO questions (
                    category_id, 
                    question_text, 
                    image_url, 
                    correct_answer, 
                    answer_image_url
                )
                VALUES (
                    ${catId}, 
                    ${isQueImg ? 'Visual Question' : questionText}, 
                    ${isQueImg ? questionText : null}, 
                    ${isAnsImg ? 'Visual Answer' : correctAnswer}, 
                    ${isAnsImg ? correctAnswer : null}
                )
            `;

            alert("Question saved successfully!");
            onDone(); // Return to Lobby
        } catch (error) {
            console.error("Critical Save Error:", error);
            alert("Error: Could not save. Make sure your database has 'image_url' and 'answer_image_url' columns.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto', color: 'white', padding: '20px', backgroundColor: '#333', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
            <h2 style={{ textAlign: 'center', color: '#28a745' }}>Add New Question</h2>
            <form onSubmit={handleSave}>
                
                {/* Category Group */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Target Category:</label>
                    <select 
                        value={selectedCategoryId} 
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none', color: 'black' }}
                    >
                        <option value="">-- Create New Category --</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    {!selectedCategoryId && (
                        <input 
                            type="text" 
                            placeholder="Type new category name..." 
                            value={newCategoryName} 
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            style={{ width: '100%', padding: '10px', marginTop: '10px', borderRadius: '5px', border: 'none', color: 'black' }}
                        />
                    )}
                </div>

                <hr style={{ border: '0.5px solid #555', margin: '20px 0' }} />

                {/* Question Group */}
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#444', borderRadius: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label>Question:</label>
                        <label style={{ fontSize: '0.85em', cursor: 'pointer' }}>
                            <input type="checkbox" checked={isQueImg} onChange={() => { setIsQueImg(!isQueImg); setQuestionText(''); }} /> Is this an Image?
                        </label>
                    </div>
                    <textarea 
                        value={questionText} 
                        onChange={(e) => setQuestionText(e.target.value)}
                        required
                        placeholder={isQueImg ? "Paste Image URL here..." : "Type question text..."}
                        style={{ width: '100%', padding: '10px', marginTop: '10px', borderRadius: '5px', height: '80px', color: 'black' }}
                    />
                    {isQueImg && questionText && (
                        <img src={questionText} alt="Preview" style={{ width: '100%', marginTop: '10px', borderRadius: '5px', maxHeight: '150px', objectFit: 'contain' }} />
                    )}
                </div>

                {/* Answer Group */}
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#444', borderRadius: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ color: '#28a745' }}>Correct Answer:</label>
                        <label style={{ fontSize: '0.85em', cursor: 'pointer' }}>
                            <input type="checkbox" checked={isAnsImg} onChange={() => { setIsAnsImg(!isAnsImg); setCorrectAnswer(''); }} /> Is this an Image?
                        </label>
                    </div>
                    <input 
                        type="text" 
                        value={correctAnswer} 
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        required
                        placeholder={isAnsImg ? "Paste Image URL here..." : "Type the answer..."}
                        style={{ width: '100%', padding: '10px', marginTop: '10px', borderRadius: '5px', border: 'none', color: 'black' }}
                    />
                    {isAnsImg && correctAnswer && (
                        <img src={correctAnswer} alt="Preview" style={{ width: '100%', marginTop: '10px', borderRadius: '5px', maxHeight: '150px', objectFit: 'contain' }} />
                    )}
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{ flex: 1, padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
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
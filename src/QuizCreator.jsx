import { useState, useEffect } from 'react';
import sql from './db.jsx'; 

export default function QuizCreator({ user, onDone }) {
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    
    // Question State
    const [questionContent, setQuestionContent] = useState('');
    const [isQueImg, setIsQueImg] = useState(false);
    
    // Answer State
    const [answerContent, setAnswerContent] = useState('');
    const [isAnsImg, setIsAnsImg] = useState(false);
    
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCats = async () => {
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
        fetchCats();
    }, [user]);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let catId = selectedCategoryId;

            // 1. Handle Category Creation
            if (!catId && newCategoryName.trim()) {
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
                alert("Please select or create a category.");
                setLoading(false);
                return;
            }

            // 2. Insert into the NEW table structure
            // Matching: question_text, image_url, correct_answer, answer_image_url
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
                    ${isQueImg ? 'Visual Question' : questionContent}, 
                    ${isQueImg ? questionContent : null}, 
                    ${isAnsImg ? 'Visual Answer' : answerContent}, 
                    ${isAnsImg ? answerContent : null}
                )
            `;

            alert("Saved successfully!");
            onDone(); 
        } catch (error) {
            console.error("Database Error:", error);
            alert("Save failed. Please ensure you ran the 'DROP TABLE' and 'CREATE TABLE' commands in Neon.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto', color: 'white', padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
            <h2 style={{ textAlign: 'center', color: '#28a745' }}>New Question</h2>
            <form onSubmit={handleSave}>
                
                <div style={{ marginBottom: '20px' }}>
                    <label>Category:</label>
                    <select 
                        value={selectedCategoryId} 
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '5px', color: 'black', marginTop: '5px' }}
                    >
                        <option value="">-- Create New --</option>
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
                            style={{ width: '100%', padding: '10px', marginTop: '10px', borderRadius: '5px', color: 'black' }}
                        />
                    )}
                </div>

                <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #555' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label>Question:</label>
                        <label style={{ fontSize: '0.8em' }}>
                            <input type="checkbox" checked={isQueImg} onChange={() => {setIsQueImg(!isQueImg); setQuestionContent('');}} /> Use Image URL
                        </label>
                    </div>
                    <textarea 
                        value={questionContent} 
                        onChange={(e) => setQuestionContent(e.target.value)}
                        required
                        placeholder={isQueImg ? "Paste Image Link..." : "Type Question..."}
                        style={{ width: '100%', padding: '10px', marginTop: '5px', color: 'black' }}
                    />
                </div>

                <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #555' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label>Correct Answer:</label>
                        <label style={{ fontSize: '0.8em' }}>
                            <input type="checkbox" checked={isAnsImg} onChange={() => {setIsAnsImg(!isAnsImg); setAnswerContent('');}} /> Use Image URL
                        </label>
                    </div>
                    <input 
                        type="text" 
                        value={answerContent} 
                        onChange={(e) => setAnswerContent(e.target.value)}
                        required
                        placeholder={isAnsImg ? "Paste Image Link..." : "Type Answer..."}
                        style={{ width: '100%', padding: '10px', marginTop: '5px', color: 'black' }}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ width: '100%', padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                    {loading ? 'Saving...' : 'Save Question'}
                </button>
            </form>
        </div>
    );
}
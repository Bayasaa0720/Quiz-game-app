import { useState, useEffect } from 'react';
import sql from './db.jsx';

export default function QuestionManager({ user, categoryId, onDone }) {
    const [questions, setQuestions] = useState([]);
    const [categoryName, setCategoryName] = useState('');
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [loading, setLoading] = useState(true);

    // Edit Form State
    const [editText, setEditText] = useState('');
    const [isQueImg, setIsQueImg] = useState(false);
    const [editAns, setEditAns] = useState('');
    const [isAnsImg, setIsAnsImg] = useState(false);

    useEffect(() => {
        fetchData();
    }, [categoryId, user]);

    const fetchData = async () => {
        if (!user || !categoryId) return;
        setLoading(true);
        try {
            const [cat] = await sql`SELECT name FROM categories WHERE id = ${categoryId} AND user_id = ${user.id}`;
            if (cat) setCategoryName(cat.name);

            const data = await sql`SELECT * FROM questions WHERE category_id = ${categoryId}`;
            setQuestions(data);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRenameCategory = async () => {
        const newName = prompt("Enter new category name:", categoryName);
        if (newName && newName !== categoryName) {
            try {
                await sql`UPDATE categories SET name = ${newName} WHERE id = ${categoryId} AND user_id = ${user.id}`;
                setCategoryName(newName);
            } catch (err) {
                alert("Name already exists.");
            }
        }
    };

    // --- NEW DELETE CATEGORY LOGIC ---
    const handleDeleteCategory = async () => {
        const confirmDelete = window.confirm(
            `WARNING: This will delete the category "${categoryName}" and ALL questions inside it. This cannot be undone. Proceed?`
        );

        if (confirmDelete) {
            try {
                // 1. Delete questions first (Database requirement)
                await sql`DELETE FROM questions WHERE category_id = ${categoryId}`;
                // 2. Delete the category
                await sql`DELETE FROM categories WHERE id = ${categoryId} AND user_id = ${user.id}`;
                
                alert("Category deleted successfully.");
                onDone(); // Redirect back to Lobby
            } catch (err) {
                console.error("Delete error:", err);
                alert("Failed to delete category.");
            }
        }
    };

    const startEdit = (q) => {
        setEditingQuestion(q.id);
        setIsQueImg(!!q.image_url);
        setEditText(q.image_url || q.question_text);
        setIsAnsImg(!!q.answer_image_url);
        setEditAns(q.answer_image_url || q.correct_answer);
    };

    const saveEdit = async (id) => {
        try {
            await sql`
                UPDATE questions SET 
                    question_text = ${isQueImg ? 'Visual Question' : editText},
                    image_url = ${isQueImg ? editText : null},
                    correct_answer = ${isAnsImg ? 'Visual Answer' : editAns},
                    answer_image_url = ${isAnsImg ? editAns : null}
                WHERE id = ${id}
            `;
            setEditingQuestion(null);
            fetchData();
        } catch (err) {
            alert("Save failed.");
        }
    };

    const deleteQuestion = async (id) => {
        if (window.confirm("Delete this question?")) {
            await sql`DELETE FROM questions WHERE id = ${id}`;
            fetchData();
        }
    };

    if (loading) return <div style={{color:'white', textAlign:'center'}}>Loading...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', color: 'white', backgroundColor: '#222', padding: '20px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #444', paddingBottom: '15px', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Category: {categoryName}</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleRenameCategory} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>
                        Rename
                    </button>
                    <button onClick={handleDeleteCategory} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>
                        Delete Category
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '20px' }}>
                {questions.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#888' }}>No questions in this category yet.</p>
                ) : (
                    questions.map(q => (
                        <div key={q.id} style={{ backgroundColor: '#333', padding: '15px', marginBottom: '10px', borderRadius: '5px', borderLeft: '5px solid #28a745' }}>
                            {editingQuestion === q.id ? (
                                <div>
                                    <label><input type="checkbox" checked={isQueImg} onChange={() => setIsQueImg(!isQueImg)} /> Question is Image</label>
                                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} style={{ width: '100%', margin: '10px 0', padding: '8px' }} />
                                    
                                    <label><input type="checkbox" checked={isAnsImg} onChange={() => setIsAnsImg(!isAnsImg)} /> Answer is Image</label>
                                    <input value={editAns} onChange={(e) => setEditAns(e.target.value)} style={{ width: '100%', margin: '10px 0', padding: '8px' }} />
                                    
                                    <div style={{ marginTop: '10px' }}>
                                        <button onClick={() => saveEdit(q.id)} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '8px 20px', marginRight: '10px', borderRadius: '4px', cursor: 'pointer' }}>Save Changes</button>
                                        <button onClick={() => setEditingQuestion(null)} style={{ backgroundColor: '#666', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ margin: '5px 0' }}><strong>Q:</strong> {q.image_url ? <span style={{color: '#17a2b8'}}>[Image]</span> : q.question_text}</p>
                                        <p style={{ margin: '5px 0' }}><strong>A:</strong> {q.answer_image_url ? <span style={{color: '#17a2b8'}}>[Image]</span> : q.correct_answer}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => startEdit(q)} style={{ background: 'none', border: '1px solid #ffc107', color: '#ffc107', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                                        <button onClick={() => deleteQuestion(q.id)} style={{ background: 'none', border: '1px solid #dc3545', color: '#dc3545', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <button onClick={onDone} style={{ marginTop: '30px', width: '100%', padding: '12px', backgroundColor: '#444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                Back to Lobby
            </button>
        </div>
    );
}
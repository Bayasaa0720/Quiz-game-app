import { useState, useEffect } from 'react';
import sql from './db.jsx';

export default function QuestionManager({ user, categoryId, onDone }) {
    const [questions, setQuestions] = useState([]);
    const [categoryName, setCategoryName] = useState('');
    const [editingQuestionId, setEditingQuestionId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Form State for the question being edited
    const [editForm, setEditForm] = useState({
        text: '',
        isQueImg: false,
        ans: '',
        isAnsImg: false
    });

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
                alert("This name is already taken.");
            }
        }
    };

    const handleDeleteCategory = async () => {
        if (window.confirm(`Delete "${categoryName}" and all its questions?`)) {
            try {
                await sql`DELETE FROM questions WHERE category_id = ${categoryId}`;
                await sql`DELETE FROM categories WHERE id = ${categoryId} AND user_id = ${user.id}`;
                onDone();
            } catch (err) {
                alert("Delete failed.");
            }
        }
    };

    // When clicking "Edit", we populate the form state
    const startEdit = (q) => {
        setEditingQuestionId(q.id);
        setEditForm({
            text: q.image_url || q.question_text,
            isQueImg: !!q.image_url,
            ans: q.answer_image_url || q.correct_answer,
            isAnsImg: !!q.answer_image_url
        });
    };

    const saveEdit = async (id) => {
        try {
            await sql`
                UPDATE questions SET 
                    question_text = ${editForm.isQueImg ? 'Visual Question' : editForm.text},
                    image_url = ${editForm.isQueImg ? editForm.text : null},
                    correct_answer = ${editForm.isAnsImg ? 'Visual Answer' : editForm.ans},
                    answer_image_url = ${editForm.isAnsImg ? editForm.ans : null}
                WHERE id = ${id}
            `;
            setEditingQuestionId(null);
            fetchData();
        } catch (err) {
            alert("Save failed.");
        }
    };

    if (loading) return <div style={{color:'white', textAlign:'center'}}>Loading...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', color: 'white', backgroundColor: '#222', padding: '20px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #444', paddingBottom: '15px' }}>
                <h2>{categoryName}</h2>
                <div>
                    <button onClick={handleRenameCategory} style={{ marginRight: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Rename</button>
                    <button onClick={handleDeleteCategory} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Delete Category</button>
                </div>
            </div>

            <div style={{ marginTop: '20px' }}>
                {questions.map(q => (
                    <div key={q.id} style={{ backgroundColor: '#333', padding: '15px', marginBottom: '10px', borderRadius: '5px' }}>
                        {editingQuestionId === q.id ? (
                            <div>
                                <label><input type="checkbox" checked={editForm.isQueImg} onChange={(e) => setEditForm({...editForm, isQueImg: e.target.checked})} /> Question is Image URL</label>
                                <textarea 
                                    value={editForm.text} 
                                    onChange={(e) => setEditForm({...editForm, text: e.target.value})} 
                                    style={{ width: '100%', margin: '10px 0', padding: '8px', color: 'black' }} 
                                />
                                
                                <label><input type="checkbox" checked={editForm.isAnsImg} onChange={(e) => setEditForm({...editForm, isAnsImg: e.target.checked})} /> Answer is Image URL</label>
                                <input 
                                    value={editForm.ans} 
                                    onChange={(e) => setEditForm({...editForm, ans: e.target.value})} 
                                    style={{ width: '100%', margin: '10px 0', padding: '8px', color: 'black' }} 
                                />
                                
                                <button onClick={() => saveEdit(q.id)} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '8px 20px', marginRight: '10px', cursor: 'pointer' }}>Save</button>
                                <button onClick={() => setEditingQuestionId(null)} style={{ backgroundColor: '#666', color: 'white', border: 'none', padding: '8px 20px', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <p><strong>Q:</strong> {q.image_url ? "[Image Question]" : q.question_text}</p>
                                    <p><strong>A:</strong> {q.answer_image_url ? "[Image Answer]" : q.correct_answer}</p>
                                </div>
                                <div>
                                    <button onClick={() => startEdit(q)} style={{ border: '1px solid #ffc107', color: '#ffc107', background: 'none', padding: '5px 10px', marginRight: '5px', cursor: 'pointer' }}>Edit</button>
                                    <button onClick={async () => { if(window.confirm("Delete?")) { await sql`DELETE FROM questions WHERE id = ${q.id}`; fetchData(); }}} style={{ border: '1px solid #dc3545', color: '#dc3545', background: 'none', padding: '5px 10px', cursor: 'pointer' }}>Delete</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <button onClick={onDone} style={{ width: '100%', marginTop: '20px', padding: '10px' }}>Back to Lobby</button>
        </div>
    );
}
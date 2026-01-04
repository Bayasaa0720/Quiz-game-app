import { useState, useEffect } from 'react';
// 1. Import your Neon connection
import sql from './db.jsx'; 

export default function QuestionManager({ categoryId, onDone }) {
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [error, setError] = useState(null);

    const [editingId, setEditingId] = useState(null); 
    const [editForm, setEditForm] = useState({
        quiz_question: '',
        correct_answer: '',
    });

    // --- Data Fetching Logic with Neon ---
    const fetchQuestions = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // 2. Fetch questions for this category using Neon
            // We removed the userId filter since we aren't using Supabase Auth for now
            const data = await sql`
                SELECT id, quiz_question, correct_answer 
                FROM quiz_items 
                WHERE category_id = ${categoryId}
            `;
            setQuestions(data || []);
        } catch (fetchError) {
            console.error('Error fetching questions:', fetchError);
            setError('Failed to load questions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (categoryId) {
            fetchQuestions();
        }
    }, [categoryId]);

    // --- Handler for Deletion ---
    const handleDelete = async (questionId) => {
        if (!window.confirm("Are you sure you want to delete this question?")) {
            return;
        }

        try {
            // 3. Delete from Neon
            await sql`
                DELETE FROM quiz_items 
                WHERE id = ${questionId}
            `;
            // Update local state
            setQuestions(prev => prev.filter(q => q.id !== questionId));
        } catch (deleteError) {
            alert('Failed to delete question.');
            console.error(deleteError);
        }
    };
    
    const startEdit = (question) => {
        setEditingId(question.id);
        setEditForm({
            quiz_question: question.quiz_question,
            correct_answer: question.correct_answer,
        });
    };

    // --- Handler for Saving Edits ---
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        
        if (!editForm.quiz_question.trim() || !editForm.correct_answer.trim()) {
            alert("Both fields are required.");
            return;
        }

        try {
            // 4. Update in Neon and return the new data
            const [updatedQuestion] = await sql`
                UPDATE quiz_items 
                SET quiz_question = ${editForm.quiz_question}, 
                    correct_answer = ${editForm.correct_answer}
                WHERE id = ${editingId}
                RETURNING id, quiz_question, correct_answer
            `;

            if (updatedQuestion) {
                setQuestions(prev => prev.map(q => 
                    q.id === editingId ? updatedQuestion : q
                ));
                setEditingId(null);
            }
        } catch (updateError) {
            alert('Failed to update question.'); 
            console.error(updateError);
        }
    };

    if (loading) return <p>Loading questions...</p>;
    if (error) return <p style={{color: 'red'}}>Error: {error}</p>;

    return (
        <div style={{ maxWidth: '700px', margin: '20px auto', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#333' }}>
            <h2 style={{ color: 'white' }}>Manage Questions</h2>
            <button 
                onClick={onDone}
                style={{ marginBottom: '20px', padding: '10px 15px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
                ← Back to Home
            </button>

            {questions.length === 0 ? (
                <p style={{ color: '#ccc' }}>No questions found for this category.</p>
            ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                    {questions.map((q) => (
                        <div key={q.id} style={{ border: '1px solid #555', padding: '10px', marginBottom: '10px', borderRadius: '4px', backgroundColor: '#444' }}>
                            {editingId === q.id ? (
                                <form onSubmit={handleSaveEdit}>
                                    <div style={{ marginBottom: '10px' }}>
                                        <label style={{ display: 'block', color: '#ccc', marginBottom: '5px' }}>Question:</label>
                                        <input
                                            type="text"
                                            value={editForm.quiz_question}
                                            onChange={(e) => setEditForm({...editForm, quiz_question: e.target.value})}
                                            style={{ width: '90%', padding: '8px', border: '1px solid #666', borderRadius: '4px', backgroundColor: '#555', color: 'white' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', color: '#ccc', marginBottom: '5px' }}>Answer:</label>
                                        <input
                                            type="text"
                                            value={editForm.correct_answer}
                                            onChange={(e) => setEditForm({...editForm, correct_answer: e.target.value})}
                                            style={{ width: '90%', padding: '8px', border: '1px solid #666', borderRadius: '4px', backgroundColor: '#555', color: 'white' }}
                                        />
                                    </div>
                                    <button type="submit" style={{ padding: '8px 12px', marginRight: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                                    <button type="button" onClick={() => setEditingId(null)} style={{ padding: '8px 12px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                                </form>
                            ) : (
                                <>
                                    <p style={{ color: 'white', margin: '5px 0' }}>**Q:** {q.quiz_question}</p>
                                    <p style={{ color: '#ccc', margin: '5px 0' }}>**A:** {q.correct_answer}</p>
                                    <div style={{ marginTop: '10px' }}>
                                        <button onClick={() => startEdit(q)} style={{ padding: '5px 10px', marginRight: '10px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                                        <button onClick={() => handleDelete(q.id)} style={{ padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
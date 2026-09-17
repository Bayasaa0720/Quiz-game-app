import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import { useModal } from './components/modalContext.js';
import './QuestionManager.css';

const DIFFICULTY_LABELS = { easy: 'Хялбар', normal: 'Дунд', hard: 'Хэцүү' };

export default function QuestionManager({ user, categoryId, onDone }) {
    const [questions, setQuestions] = useState([]);
    const [categoryName, setCategoryName] = useState('');
    const [editingQuestionId, setEditingQuestionId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const modal = useModal();

    // Form State for the question being edited
    const [editForm, setEditForm] = useState({
        text: '',
        isQueImg: false,
        ans: '',
        isAnsImg: false,
        answerType: '',
        difficulty: 'normal',
    });

    useEffect(() => {
        fetchData();
    }, [categoryId, user]);

    const fetchData = async () => {
        if (!user || !categoryId) return;
        setLoading(true);
        try {
            const { data: cat } = await supabase
                .from('categories')
                .select('name')
                .eq('id', categoryId)
                .eq('user_id', user.id)
                .maybeSingle();
            if (cat) setCategoryName(cat.name);

            const { data, error } = await supabase
                .from('quiz_items')
                .select('*')
                .eq('category_id', categoryId);
            if (error) throw error;
            setQuestions(data);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRenameCategory = async () => {
        const newName = await modal.prompt('Шинэ ангиллын нэрийг оруулна уу:', categoryName, { title: 'Ангилал нэрлэх' });
        if (newName && newName !== categoryName) {
            const { error } = await supabase
                .from('categories')
                .update({ name: newName })
                .eq('id', categoryId)
                .eq('user_id', user.id);
            if (error) {
                await modal.alert('Энэ нэр аль хэдийн ашиглагдсан байна.');
            } else {
                setCategoryName(newName);
            }
        }
    };

    const handleDeleteCategory = async () => {
        const confirmed = await modal.confirm(`«${categoryName}» ангилал болон түүний бүх асуултыг устгах уу?`, { title: 'Ангилал устгах' });
        if (confirmed) {
            try {
                const { error: delQErr } = await supabase.from('quiz_items').delete().eq('category_id', categoryId);
                if (delQErr) throw delQErr;
                const { error: delCErr } = await supabase.from('categories').delete().eq('id', categoryId).eq('user_id', user.id);
                if (delCErr) throw delCErr;
                onDone();
            } catch (err) {
                console.error("Delete failed:", err);
                await modal.alert('Устгахад алдаа гарлаа.');
            }
        }
    };

    // When clicking "Edit", we populate the form state
    const startEdit = (q) => {
        setEditingQuestionId(q.id);
        setEditForm({
            text: q.question_image_url || q.quiz_question,
            isQueImg: !!q.question_image_url,
            ans: q.answer_image_url || q.correct_answer,
            isAnsImg: !!q.answer_image_url,
            answerType: q.answer_type || '',
            difficulty: q.difficulty || 'normal',
        });
    };

    const saveEdit = async (id) => {
        const { error } = await supabase
            .from('quiz_items')
            .update({
                quiz_question: editForm.isQueImg ? 'Visual Question' : editForm.text,
                question_image_url: editForm.isQueImg ? editForm.text : null,
                correct_answer: editForm.isAnsImg ? 'Visual Answer' : editForm.ans,
                answer_image_url: editForm.isAnsImg ? editForm.ans : null,
                answer_type: editForm.answerType.trim() || null,
                difficulty: editForm.difficulty,
            })
            .eq('id', id)
            .eq('user_id', user.id);
        if (error) {
            await modal.alert('Хадгалахад алдаа гарлаа.');
        } else {
            setEditingQuestionId(null);
            fetchData();
        }
    };

    const handleDeleteQuestion = async (id) => {
        const confirmed = await modal.confirm('Энэ асуултыг устгах уу?', { title: 'Асуулт устгах' });
        if (confirmed) {
            await supabase.from('quiz_items').delete().eq('id', id).eq('user_id', user.id);
            fetchData();
        }
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>;

    const filteredQuestions = questions.filter(q => {
        const matchesDifficulty = difficultyFilter === 'all' || (q.difficulty || 'normal') === difficultyFilter;
        const haystack = `${q.quiz_question || ''} ${q.correct_answer || ''}`.toLowerCase();
        const matchesSearch = haystack.includes(searchText.trim().toLowerCase());
        return matchesDifficulty && matchesSearch;
    });

    return (
        <Card className="manager-page">
            <div className="manager-header">
                <h2>{categoryName}</h2>
                <div className="manager-header-actions">
                    <Button onClick={handleRenameCategory}>Нэр солих</Button>
                    <Button variant="danger" onClick={handleDeleteCategory}>Ангилал устгах</Button>
                </div>
            </div>

            <div className="manager-filters">
                <input
                    className="manager-search"
                    type="text"
                    placeholder="Асуулт/хариултаар хайх..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
                <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
                    <option value="all">Бүх түвшин</option>
                    <option value="easy">Хялбар</option>
                    <option value="normal">Дунд</option>
                    <option value="hard">Хэцүү</option>
                </select>
            </div>

            {filteredQuestions.length === 0 && (
                <p className="manager-empty">Тохирох асуулт олдсонгүй.</p>
            )}

            <div>
                {filteredQuestions.map(q => (
                    <div key={q.id} className="question-item">
                        {editingQuestionId === q.id ? (
                            <div>
                                <label><input type="checkbox" checked={editForm.isQueImg} onChange={(e) => setEditForm({ ...editForm, isQueImg: e.target.checked })} /> Асуулт зурган URL</label>
                                <textarea
                                    className="question-edit-field"
                                    value={editForm.text}
                                    onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                                />

                                <label><input type="checkbox" checked={editForm.isAnsImg} onChange={(e) => setEditForm({ ...editForm, isAnsImg: e.target.checked })} /> Хариулт зурган URL</label>
                                <input
                                    className="question-edit-field"
                                    value={editForm.ans}
                                    onChange={(e) => setEditForm({ ...editForm, ans: e.target.value })}
                                />
                                <input
                                    type="text"
                                    list="answer-type-options"
                                    className="question-edit-field"
                                    placeholder="Хариултын төрөл (жиш: country, player, site, count...)"
                                    value={editForm.answerType}
                                    onChange={(e) => setEditForm({ ...editForm, answerType: e.target.value })}
                                />
                                <datalist id="answer-type-options">
                                    <option value="flag" />
                                    <option value="map" />
                                    <option value="year" />
                                    <option value="country" />
                                    <option value="player" />
                                    <option value="real_name" />
                                    <option value="team" />
                                    <option value="tournament" />
                                    <option value="site" />
                                    <option value="count" />
                                </datalist>

                                <label>Хэцүү зэрэг:</label>
                                <select
                                    className="question-edit-field"
                                    value={editForm.difficulty}
                                    onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                                >
                                    <option value="easy">Хялбар</option>
                                    <option value="normal">Дунд</option>
                                    <option value="hard">Хэцүү</option>
                                </select>

                                <div className="question-edit-actions">
                                    <Button variant="success" onClick={() => saveEdit(q.id)}>Хадгалах</Button>
                                    <Button variant="ghost" onClick={() => setEditingQuestionId(null)}>Цуцлах</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="question-item-view">
                                <div>
                                    <p><strong>А:</strong> {q.question_image_url ? "[Зурган асуулт]" : q.quiz_question}</p>
                                    <p><strong>Х:</strong> {q.answer_image_url ? "[Зурган хариулт]" : q.correct_answer}</p>
                                    <span className={`difficulty-badge difficulty-${q.difficulty || 'normal'}`}>
                                        {DIFFICULTY_LABELS[q.difficulty] || 'Дунд'}
                                    </span>
                                    {q.answer_type && (
                                        <span className="difficulty-badge">{q.answer_type}</span>
                                    )}
                                </div>
                                <div className="question-item-actions">
                                    <Button variant="ghost" onClick={() => startEdit(q)}>Засах</Button>
                                    <Button variant="danger" onClick={() => handleDeleteQuestion(q.id)}>Устгах</Button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <Button variant="ghost" onClick={onDone} className="manager-footer">← Lobby руу буцах</Button>
        </Card>
    );
}

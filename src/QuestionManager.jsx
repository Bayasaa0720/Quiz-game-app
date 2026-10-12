import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import { useModal } from './components/modalContext.js';
import { SUPPORTED_ANSWER_TYPES } from './lib/decoyGenerators.js';
import './QuestionManager.css';

const DIFFICULTY_LABELS = { easy: 'Easy', normal: 'Medium', hard: 'Hard' };

export default function QuestionManager({ user, categoryId, onDone }) {
    const [questions, setQuestions] = useState([]);
    const [categoryName, setCategoryName] = useState('');
    const [categoryMeta, setCategoryMeta] = useState({ is_global: false, is_public_requested: false });
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

    const [typeCount, setTypeCount] = useState(null);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // QuizCreator.jsx-тай адил live counter — энэ ангилалд ижил
    // answer_type-тай хэдэн асуулт байгааг харуулна (засаж буй мөрөө
    // тооноос хасна).
    useEffect(() => {
        const type = editForm.answerType.trim();
        if (!editingQuestionId || !type) {
            setTypeCount(null);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            let query = supabase
                .from('quiz_items')
                .select('id', { count: 'exact', head: true })
                .eq('category_id', categoryId)
                .eq('answer_type', type);
            if (typeof editingQuestionId === 'string') {
                query = query.neq('id', editingQuestionId);
            }
            const { count, error } = await query;
            if (!cancelled && !error) setTypeCount(count ?? 0);
        }, 400);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [categoryId, editingQuestionId, editForm.answerType]);

    useEffect(() => {
        fetchData();
    }, [categoryId, user]);

    const fetchData = async () => {
        if (!user || !categoryId) return;
        setLoading(true);
        try {
            const { data: cat } = await supabase
                .from('categories')
                .select('name, is_global, is_public_requested')
                .eq('id', categoryId)
                .eq('user_id', user.id)
                .maybeSingle();
            if (!mountedRef.current) return;
            if (cat) {
                setCategoryName(cat.name);
                setCategoryMeta({ is_global: cat.is_global, is_public_requested: cat.is_public_requested });
            }

            const { data, error } = await supabase
                .from('quiz_items')
                .select('*')
                .eq('category_id', categoryId);
            if (error) throw error;
            if (mountedRef.current) setQuestions(data);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const handleRenameCategory = async () => {
        const newName = await modal.prompt('Enter the new category name:', categoryName, { title: 'Rename category' });
        if (newName && newName !== categoryName) {
            const { error } = await supabase
                .from('categories')
                .update({ name: newName })
                .eq('id', categoryId)
                .eq('user_id', user.id);
            if (error) {
                await modal.alert('This name is already in use.');
            } else {
                setCategoryName(newName);
            }
        }
    };

    const handleRequestPublic = async () => {
        const confirmed = await modal.confirm(
            `Request "${categoryName}" to become a public tower? Once approved by an admin, all users will see it.`,
            { title: 'Request public tower' }
        );
        if (!confirmed) return;
        const { error } = await supabase
            .from('categories')
            .update({ is_public_requested: true, is_public_requested_at: new Date().toISOString() })
            .eq('id', categoryId)
            .eq('user_id', user.id);
        if (error) {
            console.error('Failed to request public:', error);
            await modal.alert('Failed to send the request.');
        } else {
            setCategoryMeta(m => ({ ...m, is_public_requested: true }));
            await modal.alert('Request sent. An admin will review it.');
        }
    };

    const handleDeleteCategory = async () => {
        const confirmed = await modal.confirm(`Delete "${categoryName}" and all of its questions?`, { title: 'Delete category' });
        if (confirmed) {
            try {
                const { error: delQErr } = await supabase.from('quiz_items').delete().eq('category_id', categoryId);
                if (delQErr) throw delQErr;
                const { error: delCErr } = await supabase.from('categories').delete().eq('id', categoryId).eq('user_id', user.id);
                if (delCErr) throw delCErr;
                onDone();
            } catch (err) {
                console.error("Delete failed:", err);
                await modal.alert('Failed to delete.');
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
        if (!editForm.text.trim() || !editForm.ans.trim()) {
            await modal.alert('Question and answer cannot be empty.');
            return;
        }
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
            await modal.alert('Failed to save.');
        } else {
            setEditingQuestionId(null);
            fetchData();
        }
    };

    const handleDeleteQuestion = async (id) => {
        const confirmed = await modal.confirm('Delete this question?', { title: 'Delete question' });
        if (confirmed) {
            await supabase.from('quiz_items').delete().eq('id', id).eq('user_id', user.id);
            fetchData();
        }
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Loading...</p>;

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
                    <Button onClick={handleRenameCategory}>Rename</Button>
                    {!categoryMeta.is_global && (
                        <Button
                            variant="ghost"
                            onClick={handleRequestPublic}
                            disabled={categoryMeta.is_public_requested}
                        >
                            {categoryMeta.is_public_requested ? 'Request sent' : 'Request public'}
                        </Button>
                    )}
                    <Button variant="danger" onClick={handleDeleteCategory}>Delete category</Button>
                </div>
            </div>

            <div className="manager-filters">
                <input
                    className="manager-search"
                    type="text"
                    placeholder="Search by question/answer..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
                <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
                    <option value="all">All difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="normal">Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div>

            {filteredQuestions.length === 0 && (
                <p className="manager-empty">No matching questions found.</p>
            )}

            <div>
                {filteredQuestions.map(q => (
                    <div key={q.id} className="question-item">
                        {editingQuestionId === q.id ? (
                            <div>
                                <label><input type="checkbox" checked={editForm.isQueImg} onChange={(e) => setEditForm({ ...editForm, isQueImg: e.target.checked })} /> Question image URL</label>
                                <textarea
                                    className="question-edit-field"
                                    value={editForm.text}
                                    onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                                />

                                <label><input type="checkbox" checked={editForm.isAnsImg} onChange={(e) => setEditForm({ ...editForm, isAnsImg: e.target.checked })} /> Answer image URL</label>
                                <input
                                    className="question-edit-field"
                                    value={editForm.ans}
                                    onChange={(e) => setEditForm({ ...editForm, ans: e.target.value })}
                                />
                                <input
                                    type="text"
                                    list="answer-type-options"
                                    className="question-edit-field"
                                    placeholder="Answer type (e.g. country, player, site, count...)"
                                    value={editForm.answerType}
                                    onChange={(e) => setEditForm({ ...editForm, answerType: e.target.value })}
                                />
                                <datalist id="answer-type-options">
                                    {SUPPORTED_ANSWER_TYPES.map(t => <option key={t} value={t} />)}
                                </datalist>
                                {typeCount !== null && (
                                    <p className="field-hint answer-type-counter">
                                        This category has {typeCount} other question{typeCount === 1 ? '' : 's'} of type "{editForm.answerType.trim()}"{typeCount < 3 ? ' — decoy options may be thin' : ''}.
                                    </p>
                                )}

                                <label>Difficulty:</label>
                                <select
                                    className="question-edit-field"
                                    value={editForm.difficulty}
                                    onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="normal">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>

                                <div className="question-edit-actions">
                                    <Button variant="success" onClick={() => saveEdit(q.id)}>Save</Button>
                                    <Button variant="ghost" onClick={() => setEditingQuestionId(null)}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="question-item-view">
                                <div>
                                    <p><strong>Q:</strong> {q.question_image_url ? "[Image question]" : q.quiz_question}</p>
                                    <p><strong>A:</strong> {q.answer_image_url ? "[Image answer]" : q.correct_answer}</p>
                                    <span className={`difficulty-badge difficulty-${q.difficulty || 'normal'}`}>
                                        {DIFFICULTY_LABELS[q.difficulty] || 'Medium'}
                                    </span>
                                    {q.answer_type && (
                                        <span className="difficulty-badge">{q.answer_type}</span>
                                    )}
                                </div>
                                <div className="question-item-actions">
                                    <Button variant="ghost" onClick={() => startEdit(q)}>Edit</Button>
                                    <Button variant="danger" onClick={() => handleDeleteQuestion(q.id)}>Delete</Button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <Button variant="ghost" onClick={onDone} className="manager-footer">← Back to Lobby</Button>
        </Card>
    );
}

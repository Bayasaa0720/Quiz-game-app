import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import { useModal } from './components/modalContext.js';
import { SUPPORTED_ANSWER_TYPES } from './lib/decoyGenerators.js';
import './QuizCreator.css';

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
    const [answerType, setAnswerType] = useState('');

    const [difficulty, setDifficulty] = useState('normal');

    const [loading, setLoading] = useState(false);
    const [typeCount, setTypeCount] = useState(null);
    const modal = useModal();

    // Сонгосон answer_type-тай ижил төрлийн бусад асуултын тоог (энэ
    // ангилалд) live харуулна — decoy сан хэр баялаг байгааг зохиогчид
    // мэдүүлнэ. Зөвхөн одоо байгаа ангилал сонгосон үед л (шинэ ангилалд
    // лавлах юм алга).
    useEffect(() => {
        const type = answerType.trim();
        if (!selectedCategoryId || !type) {
            setTypeCount(null);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            const { count, error } = await supabase
                .from('quiz_items')
                .select('id', { count: 'exact', head: true })
                .eq('category_id', selectedCategoryId)
                .eq('answer_type', type);
            if (!cancelled && !error) setTypeCount(count ?? 0);
        }, 400);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [selectedCategoryId, answerType]);

    useEffect(() => {
        const fetchCats = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('id, name')
                    .eq('user_id', user.id)
                    .order('name', { ascending: true });
                if (error) throw error;
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
                const { data: existing, error: findErr } = await supabase
                    .from('categories')
                    .select('id')
                    .eq('name', newCategoryName.trim())
                    .eq('user_id', user.id);
                if (findErr) throw findErr;

                if (existing.length > 0) {
                    catId = existing[0].id;
                } else {
                    const { data: newCat, error: insertCatErr } = await supabase
                        .from('categories')
                        .insert({ name: newCategoryName.trim(), user_id: user.id })
                        .select('id')
                        .single();
                    if (insertCatErr) {
                        // 23505 = unique_violation — (name, user_id) дээрх
                        // DB-ийн unique index-д өртсөн тул өөр хэн нэг нь
                        // (эсвэл давхар submit) яг энэ мөчид ижил нэртэй
                        // ангилал үүсгэчихсэн байж болно. Crash-лэхийн оронд
                        // шинээр үүссэн мөрийг дахин уншина.
                        if (insertCatErr.code === '23505') {
                            const { data: raceWinner, error: refetchErr } = await supabase
                                .from('categories')
                                .select('id')
                                .eq('name', newCategoryName.trim())
                                .eq('user_id', user.id)
                                .single();
                            if (refetchErr) throw refetchErr;
                            catId = raceWinner.id;
                        } else {
                            throw insertCatErr;
                        }
                    } else {
                        catId = newCat.id;
                    }
                }
            }

            if (!catId) {
                await modal.alert('Select a category or create a new one.');
                setLoading(false);
                return;
            }

            // 2. Insert the question, matching the quiz_items table columns
            const { error: insertQErr } = await supabase.from('quiz_items').insert({
                category_id: catId,
                user_id: user.id,
                quiz_question: isQueImg ? 'Visual Question' : questionContent,
                question_image_url: isQueImg ? questionContent : null,
                correct_answer: isAnsImg ? 'Visual Answer' : answerContent,
                answer_image_url: isAnsImg ? answerContent : null,
                answer_type: answerType.trim() || null,
                difficulty,
            });
            if (insertQErr) throw insertQErr;

            await modal.alert('Saved successfully!');
            onDone();
        } catch (error) {
            console.error("Database Error:", error);
            await modal.alert('Failed to save: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="creator-page">
            <Button variant="ghost" onClick={onDone} className="creator-back">← Back to Lobby</Button>
            <h2>New question</h2>
            <form onSubmit={handleSave}>

                <div className="form-field">
                    <label>Category:</label>
                    <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                    >
                        <option value="">-- Create new --</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    {!selectedCategoryId && (
                        <input
                            type="text"
                            className="new-category-input"
                            placeholder="New category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                    )}
                </div>

                <div className="form-field-box">
                    <div className="field-row">
                        <label>Question:</label>
                        <label><input type="checkbox" checked={isQueImg} onChange={() => { setIsQueImg(!isQueImg); setQuestionContent(''); }} /> <span>Use image URL</span></label>
                    </div>
                    <textarea
                        value={questionContent}
                        onChange={(e) => setQuestionContent(e.target.value)}
                        required
                        placeholder={isQueImg ? "Enter the image link..." : "Write your question..."}
                    />
                </div>

                <div className="form-field-box">
                    <div className="field-row">
                        <label>Correct answer:</label>
                        <label><input type="checkbox" checked={isAnsImg} onChange={() => { setIsAnsImg(!isAnsImg); setAnswerContent(''); setAnswerType(''); }} /> <span>Use image URL</span></label>
                    </div>
                    <input
                        type="text"
                        value={answerContent}
                        onChange={(e) => setAnswerContent(e.target.value)}
                        required
                        placeholder={isAnsImg ? "Enter the image link..." : "Write the answer..."}
                    />
                    <input
                        type="text"
                        list="answer-type-options"
                        className="new-category-input"
                        placeholder="Answer type (e.g. country, player, site, count...)"
                        value={answerType}
                        onChange={(e) => setAnswerType(e.target.value)}
                    />
                    <datalist id="answer-type-options">
                        {SUPPORTED_ANSWER_TYPES.map(t => <option key={t} value={t} />)}
                    </datalist>
                    {typeCount !== null && (
                        <p className="field-hint answer-type-counter">
                            This category has {typeCount} question{typeCount === 1 ? '' : 's'} of type "{answerType.trim()}"{typeCount < 3 ? ' — decoy options may be thin' : ''}.
                        </p>
                    )}
                    <p className="field-hint">Only wrong answers of the same type get mixed in as options — enter the type carefully so unrelated questions don't get mixed together.</p>
                </div>

                <div className="form-field">
                    <label>Difficulty:</label>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                    >
                        <option value="easy">Easy</option>
                        <option value="normal">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>

                <Button type="submit" variant="success" disabled={loading} fullWidth>
                    {loading ? 'Saving...' : 'Save question'}
                </Button>
            </form>
        </Card>
    );
}

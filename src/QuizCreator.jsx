import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import { useModal } from './components/modalContext.js';
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
    const modal = useModal();

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
                    if (insertCatErr) throw insertCatErr;
                    catId = newCat.id;
                }
            }

            if (!catId) {
                await modal.alert('Ангилал сонгох эсвэл шинээр үүсгэнэ үү.');
                setLoading(false);
                return;
            }

            // 2. Generate AI decoy (wrong) answers — only for text answers; an
            // image answer needs image decoys, which text generation can't
            // produce, so those still fall back to the category pool in
            // Battle.jsx. Failure here is non-fatal: the question still saves,
            // just without stored decoys.
            let decoys = null;
            if (!isAnsImg) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const categoryName = selectedCategoryId
                        ? categories.find(c => c.id === selectedCategoryId)?.name
                        : newCategoryName.trim();
                    const aiRes = await fetch('/api/generate-decoys', {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                            ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
                        },
                        body: JSON.stringify({
                            question: questionContent,
                            correct_answer: answerContent,
                            answer_type: answerType.trim() || null,
                            category_name: categoryName,
                        }),
                    });
                    if (aiRes.ok) {
                        const body = await aiRes.json();
                        if (Array.isArray(body.decoys) && body.decoys.length > 0) decoys = body.decoys;
                    } else {
                        console.error('AI decoy generation failed:', aiRes.status, await aiRes.text());
                    }
                } catch (aiErr) {
                    console.error('AI decoy generation error:', aiErr);
                }
            }

            // 3. Insert the question, matching the quiz_items table columns
            const { error: insertQErr } = await supabase.from('quiz_items').insert({
                category_id: catId,
                user_id: user.id,
                quiz_question: isQueImg ? 'Visual Question' : questionContent,
                question_image_url: isQueImg ? questionContent : null,
                correct_answer: isAnsImg ? 'Visual Answer' : answerContent,
                answer_image_url: isAnsImg ? answerContent : null,
                answer_type: answerType.trim() || null,
                decoys,
                difficulty,
            });
            if (insertQErr) throw insertQErr;

            await modal.alert('Амжилттай хадгалагдлаа!');
            onDone();
        } catch (error) {
            console.error("Database Error:", error);
            await modal.alert('Хадгалахад алдаа гарлаа: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="creator-page">
            <Button variant="ghost" onClick={onDone} className="creator-back">← Lobby руу буцах</Button>
            <h2>Шинэ асуулт</h2>
            <form onSubmit={handleSave}>

                <div className="form-field">
                    <label>Ангилал:</label>
                    <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                    >
                        <option value="">-- Шинээр үүсгэх --</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    {!selectedCategoryId && (
                        <input
                            type="text"
                            className="new-category-input"
                            placeholder="Шинэ ангиллын нэр"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                    )}
                </div>

                <div className="form-field-box">
                    <div className="field-row">
                        <label>Асуулт:</label>
                        <label><input type="checkbox" checked={isQueImg} onChange={() => { setIsQueImg(!isQueImg); setQuestionContent(''); }} /> <span>Зурган URL ашиглах</span></label>
                    </div>
                    <textarea
                        value={questionContent}
                        onChange={(e) => setQuestionContent(e.target.value)}
                        required
                        placeholder={isQueImg ? "Зургийн линк оруулна уу..." : "Асуултаа бичнэ үү..."}
                    />
                </div>

                <div className="form-field-box">
                    <div className="field-row">
                        <label>Зөв хариулт:</label>
                        <label><input type="checkbox" checked={isAnsImg} onChange={() => { setIsAnsImg(!isAnsImg); setAnswerContent(''); setAnswerType(''); }} /> <span>Зурган URL ашиглах</span></label>
                    </div>
                    <input
                        type="text"
                        value={answerContent}
                        onChange={(e) => setAnswerContent(e.target.value)}
                        required
                        placeholder={isAnsImg ? "Зургийн линк оруулна уу..." : "Хариултаа бичнэ үү..."}
                    />
                    <input
                        type="text"
                        list="answer-type-options"
                        className="new-category-input"
                        placeholder="Хариултын төрөл (жиш: country, player, site, count...)"
                        value={answerType}
                        onChange={(e) => setAnswerType(e.target.value)}
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
                    <p className="field-hint">Ижил төрлийн буруу хариултууд л сонголт болж холилдоно — ялгаатай сэдэвтэй асуултуудыг холихгүйн тулд төрлөө зөв бичээрэй.</p>
                </div>

                <div className="form-field">
                    <label>Хэцүү зэрэг:</label>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                    >
                        <option value="easy">Хялбар</option>
                        <option value="normal">Дунд</option>
                        <option value="hard">Хэцүү</option>
                    </select>
                </div>

                {!isAnsImg && (
                    <p className="field-hint">
                        Хадгалахад AI автоматаар энэ асуултад тохирсон 9 хуурамч (буруу) хариулт үүсгэж хадгална — тоглох бүрд тэднээс 3-ыг санамсаргүй сонгож харуулна.
                    </p>
                )}

                <Button type="submit" variant="success" disabled={loading} fullWidth>
                    {loading ? (isAnsImg ? 'Хадгалж байна...' : 'AI decoy үүсгэж, хадгалж байна...') : 'Асуулт хадгалах'}
                </Button>
            </form>
        </Card>
    );
}

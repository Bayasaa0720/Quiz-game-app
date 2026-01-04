import { useState, useEffect } from 'react';
import sql from './db.jsx';

export default function QuizGame({ categoryId, onDone }) {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [options, setOptions] = useState([]);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);

    useEffect(() => {
        const loadGame = async () => {
            const data = await sql`SELECT * FROM questions WHERE category_id = ${categoryId}`;
            setQuestions(data);
            if (data.length > 0) generateOptions(data[0], data);
        };
        loadGame();
    }, [categoryId]);

    const generateOptions = (currentQ, allQs) => {
        // We create an object for each option to know if it's an image or text
        const correct = { 
            text: currentQ.correct_answer, 
            img: currentQ.answer_image_url 
        };
        
        const others = allQs
            .filter(q => q.id !== currentQ.id)
            .map(q => ({ text: q.correct_answer, img: q.answer_image_url }));

        const randomWrongs = others.sort(() => 0.5 - Math.random()).slice(0, 3);
        const combined = [correct, ...randomWrongs].sort(() => 0.5 - Math.random());
        setOptions(combined);
    };

    const handleAnswer = (choice) => {
        const currentQ = questions[currentIndex];
        // Check if the chosen text or image matches the correct one
        if (choice.text === currentQ.correct_answer || (choice.img && choice.img === currentQ.answer_image_url)) {
            setScore(score + 1);
        }

        const next = currentIndex + 1;
        if (next < questions.length) {
            setCurrentIndex(next);
            generateOptions(questions[next], questions);
        } else {
            setShowResult(true);
        }
    };

    if (questions.length === 0) return <div style={{color: 'white', textAlign: 'center'}}>Loading...</div>;

    if (showResult) {
        return (
            <div style={{ textAlign: 'center', color: 'white' }}>
                <h2>Score: {score} / {questions.length}</h2>
                <button onClick={onDone} style={{ padding: '10px 20px' }}>Back</button>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', color: 'white' }}>
            {/* Display Question Image or Text */}
            {currentQ.image_url ? (
                <img src={currentQ.image_url} alt="Question" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '10px' }} />
            ) : (
                <h2 style={{ fontSize: '1.8em' }}>{currentQ.question_text}</h2>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '30px' }}>
                {options.map((opt, i) => (
                    <button key={i} onClick={() => handleAnswer(opt)} style={{ padding: '15px', backgroundColor: '#444', color: 'white', borderRadius: '8px', cursor: 'pointer', minHeight: '80px' }}>
                        {opt.img ? (
                            <img src={opt.img} alt="Answer" style={{ width: '100%', maxHeight: '60px', objectFit: 'contain' }} />
                        ) : (
                            opt.text
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
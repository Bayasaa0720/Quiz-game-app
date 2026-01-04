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
            try {
                const data = await sql`SELECT * FROM questions WHERE category_id = ${categoryId}`;
                setQuestions(data);
                if (data.length > 0) generateOptions(data[0], data);
            } catch (err) {
                console.error("Error loading quiz:", err);
            }
        };
        loadGame();
    }, [categoryId]);

    const generateOptions = (currentQ, allQs) => {
        const correct = currentQ.correct_answer;
        
        // Get other answers from this specific category for multiple choice
        const otherAnswers = allQs
            .map(q => q.correct_answer)
            .filter(ans => ans !== correct); 

        // Randomly pick 3 wrong answers
        const randomWrongs = otherAnswers
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
        
        // Combine and shuffle the buttons
        const combined = [correct, ...randomWrongs].sort(() => 0.5 - Math.random());
        setOptions(combined);
    };

    const handleAnswer = (choice) => {
        if (choice === questions[currentIndex].correct_answer) setScore(score + 1);

        const next = currentIndex + 1;
        if (next < questions.length) {
            setCurrentIndex(next);
            generateOptions(questions[next], questions);
        } else {
            setShowResult(true);
        }
    };

    if (questions.length === 0) return <div style={{color: 'white', textAlign: 'center'}}>Loading Quiz...</div>;

    if (showResult) {
        return (
            <div style={{ textAlign: 'center', color: 'white' }}>
                <h2>Quiz Complete!</h2>
                <p style={{ fontSize: '2em' }}>Score: {score} / {questions.length}</p>
                <button onClick={onDone} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Return to Lobby
                </button>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', color: 'white' }}>
            <p style={{ color: '#aaa' }}>Question {currentIndex + 1} of {questions.length}</p>
            
            {/* Conditional Image Display */}
            {currentQ.image_url && (
                <div style={{ marginBottom: '20px' }}>
                    <img 
                        src={currentQ.image_url} 
                        alt="Quiz Visual" 
                        style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '10px', border: '1px solid #444' }} 
                    />
                </div>
            )}
            
            <h2 style={{ fontSize: '1.8em', marginBottom: '30px' }}>{currentQ.question_text}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {options.map((opt, i) => (
                    <button
                        key={i}
                        onClick={() => handleAnswer(opt)}
                        style={{ padding: '20px', fontSize: '1.1em', backgroundColor: '#444', color: 'white', border: '1px solid #555', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}
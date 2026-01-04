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
                if (data.length > 0) {
                    generateOptions(data[0], data);
                }
            } catch (err) {
                console.error("Error loading quiz:", err);
            }
        };
        loadGame();
    }, [categoryId]);

    const generateOptions = (currentQ, allQs) => {
        const correct = currentQ.correct_answer;
        
        // Get all other unique correct answers in this category to use as wrong ones
        const otherAnswers = allQs
            .map(q => q.correct_answer)
            .filter(ans => ans !== correct); 

        // Shuffle the other answers and take up to 3
        const randomWrongOnes = otherAnswers
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        
        // Combine with the correct one and shuffle the final 4 buttons
        const combined = [correct, ...randomWrongOnes].sort(() => Math.random() - 0.5);
        setOptions(combined);
    };

    const handleAnswer = (selectedChoice) => {
        if (selectedChoice === questions[currentIndex].correct_answer) {
            setScore(score + 1);
        }

        const nextIndex = currentIndex + 1;
        if (nextIndex < questions.length) {
            setCurrentIndex(nextIndex);
            generateOptions(questions[nextIndex], questions);
        } else {
            setShowResult(true);
        }
    };

    if (questions.length === 0) return <div style={{color: 'white', textAlign: 'center'}}>Loading questions...</div>;

    if (showResult) {
        return (
            <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
                <h2>Quiz Complete!</h2>
                <p style={{ fontSize: '2em' }}>{score} / {questions.length}</p>
                <button 
                    onClick={onDone} 
                    style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                    Return to Lobby
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', color: 'white' }}>
            <div style={{ marginBottom: '20px', color: '#aaa' }}>
                Question {currentIndex + 1} of {questions.length}
            </div>
            
            <h2 style={{ fontSize: '1.8em', marginBottom: '30px' }}>
                {questions[currentIndex].question_text}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleAnswer(option)}
                        style={{
                            padding: '20px',
                            fontSize: '1.1em',
                            backgroundColor: '#444',
                            color: 'white',
                            border: '1px solid #555',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#555'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#444'}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
}
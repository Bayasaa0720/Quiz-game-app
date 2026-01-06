import { useState, useEffect } from 'react';
import sql from './db.jsx';

export default function QuizGame({ categoryId, onDone }) {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [options, setOptions] = useState([]);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    
    // New states for the feedback logic
    const [selectedChoice, setSelectedChoice] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);

    useEffect(() => {
        const loadGame = async () => {
            const data = await sql`SELECT * FROM questions WHERE category_id = ${categoryId}`;
            setQuestions(data);
            if (data.length > 0) generateOptions(data[0], data);
        };
        loadGame();
    }, [categoryId]);

    const generateOptions = (currentQ, allQs) => {
        const correct = { text: currentQ.correct_answer, img: currentQ.answer_image_url, isCorrect: true };
        const others = allQs
            .filter(q => q.id !== currentQ.id)
            .map(q => ({ text: q.correct_answer, img: q.answer_image_url, isCorrect: false }));

        const randomWrongs = others.sort(() => 0.5 - Math.random()).slice(0, 3);
        const combined = [correct, ...randomWrongs].sort(() => 0.5 - Math.random());
        setOptions(combined);
    };

    const handleSelect = (choice) => {
        if (isAnswered) return; // Prevent changing answer after clicking
        
        setSelectedChoice(choice);
        setIsAnswered(true);

        if (choice.isCorrect) {
            setScore(score + 1);
        }
    };

    const handleNext = () => {
        const next = currentIndex + 1;
        if (next < questions.length) {
            setCurrentIndex(next);
            generateOptions(questions[next], questions);
            // Reset for next question
            setSelectedChoice(null);
            setIsAnswered(false);
        } else {
            setShowResult(true);
        }
    };

    if (questions.length === 0) return <div style={{color:'white', textAlign:'center'}}>Loading...</div>;

    if (showResult) {
        return (
            <div style={{ textAlign: 'center', color: 'white' }}>
                <h2>Results: {score} / {questions.length}</h2>
                <button onClick={onDone} style={{ padding: '10px 20px', cursor: 'pointer' }}>Back to Lobby</button>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', color: 'white' }}>
            <p>Question {currentIndex + 1} of {questions.length}</p>
            
            {currentQ.image_url ? (
                <img src={currentQ.image_url} alt="Question" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '10px' }} />
            ) : (
                <h2 style={{ fontSize: '1.8em' }}>{currentQ.question_text}</h2>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '30px' }}>
                {options.map((opt, i) => {
                    // Logic for button colors
                    let bgColor = '#444'; // Default
                    if (isAnswered) {
                        if (opt.isCorrect) {
                            bgColor = '#28a745'; // Correct answer always turns Green
                        } else if (selectedChoice === opt && !opt.isCorrect) {
                            bgColor = '#dc3545'; // If we picked this and it's wrong, turn Red
                        }
                    }

                    return (
                        <button 
                            key={i} 
                            onClick={() => handleSelect(opt)} 
                            disabled={isAnswered}
                            style={{ 
                                padding: '15px', 
                                backgroundColor: bgColor, 
                                color: 'white', 
                                borderRadius: '8px', 
                                cursor: isAnswered ? 'default' : 'pointer',
                                border: 'none',
                                transition: '0.3s'
                            }}
                        >
                            {opt.img ? (
                                <img src={opt.img} alt="Answer" style={{ width: '100%', maxHeight: '60px', objectFit: 'contain' }} />
                            ) : (
                                opt.text
                            )}
                        </button>
                    );
                })}
            </div>

            {/* SHOW NEXT BUTTON ONLY AFTER ANSWERING */}
            {isAnswered && (
                <div style={{ marginTop: '30px' }}>
                    <button 
                        onClick={handleNext}
                        style={{ 
                            padding: '15px 40px', 
                            fontSize: '1.2em', 
                            backgroundColor: '#007bff', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '50px', 
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(0,123,255,0.4)'
                        }}
                    >
                        {currentIndex + 1 === questions.length ? "Finish Quiz" : "Next Question →"}
                    </button>
                </div>
            )}
        </div>
    );
}
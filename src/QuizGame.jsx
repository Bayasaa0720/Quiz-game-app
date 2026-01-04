import { useState, useEffect } from 'react';
import sql from './db.jsx';

export default function QuizGame({ categoryId, onDone }) {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [options, setOptions] = useState([]);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [gameOver, setGameOver] = useState(false);

    // --- Fetch Logic ---
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                setLoading(true);
                // Ensure categoryId is treated as a number
                const data = await sql`
                    SELECT id, quiz_question, correct_answer 
                    FROM quiz_items 
                    WHERE category_id = ${parseInt(categoryId)}
                `;
                setQuestions(data);
                if (data.length > 0) generateOptions(data[0], data);
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        if (categoryId) fetchQuestions();
    }, [categoryId]);

    // --- Generate 4 Multiple Choice Buttons ---
    const generateOptions = (currentQuestion, allQuestions) => {
        const correct = currentQuestion.correct_answer;
        let wrongAnswers = allQuestions
            .map(q => q.correct_answer)
            .filter(ans => ans !== correct);

        // Shuffle and pick up to 3 wrong answers
        wrongAnswers = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, 3);
        const combined = [...wrongAnswers, correct].sort(() => 0.5 - Math.random());
        setOptions(combined);
    };

    const handleChoice = (choice) => {
        setSelectedAnswer(choice);
        if (choice === questions[currentIndex].correct_answer) {
            setScore(prev => prev + 1);
        }
        setShowResult(true);
    };

    const nextQuestion = () => {
        const nextIdx = currentIndex + 1;
        if (nextIdx < questions.length) {
            setCurrentIndex(nextIdx);
            generateOptions(questions[nextIdx], questions);
            setShowResult(false);
            setSelectedAnswer(null);
        } else {
            setGameOver(true); // Switch to the results box
        }
    };

    // --- Helper to show Text or Image ---
    const renderMedia = (content, isButton = false) => {
    if (!content) return null;
    
    if (content.toString().startsWith('http')) {
        return (
            <div style={{
                width: '100%',
                height: isButton ? '80px' : '200px', // Fixed height for consistency
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                borderRadius: '8px',
                backgroundColor: '#2a2a2a' // Fills space if image is transparent
            }}>
                <img 
                    src={content} 
                    alt="Quiz Content" 
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain', // 👈 This keeps the proportions without stretching
                        padding: '5px'
                    }} 
                />
            </div>
            );
        }
        return <span style={{ fontSize: isButton ? '1rem' : '1.5rem' }}>{content}</span>;
    };

    if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Loading Quiz...</div>;

    // --- 1. FINAL RESULTS BOX ---
    if (gameOver) {
        return (
            <div style={{ 
                maxWidth: '500px', margin: '40px auto', padding: '40px', 
                backgroundColor: '#222', color: 'white', borderRadius: '20px', 
                textAlign: 'center', border: '2px solid #28a745' 
            }}>
                <h1 style={{ color: '#28a745' }}>Quiz Completed!</h1>
                <div style={{ margin: '30px 0' }}>
                    <p style={{ fontSize: '1.2rem', color: '#aaa' }}>Your Final Score</p>
                    <p style={{ fontSize: '4rem', fontWeight: 'bold', margin: '10px 0' }}>
                        {score} <span style={{ fontSize: '1.5rem', color: '#666' }}>/ {questions.length}</span>
                    </p>
                </div>
                
                <button 
                    onClick={() => {
                        console.log("Navigating back to lobby..."); // To verify in Console
                        onDone(); 
                    }} 
                    style={{ 
                        width: '100%', padding: '15px', backgroundColor: '#007bff', 
                        color: 'white', border: 'none', borderRadius: '10px', 
                        fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' 
                    }}
                >
                    Return to Lobby
                </button>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    // --- 2. ACTIVE QUIZ UI ---
    return (
        <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', backgroundColor: '#333', color: 'white', borderRadius: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#aaa' }}>
                <span>Question {currentIndex + 1} / {questions.length}</span>
                <span>Score: {score}</span>
            </div>
            
            <div style={{ minHeight: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', backgroundColor: '#444', borderRadius: '10px' }}>
                {renderMedia(currentQ.quiz_question)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
                {options.map((opt, index) => (
                    <button
                        key={index}
                        disabled={showResult}
                        onClick={() => handleChoice(opt)}
                        style={{
                            padding: '15px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            minHeight: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                            backgroundColor: showResult 
                                ? (opt === currentQ.correct_answer ? '#28a745' : (opt === selectedAnswer ? '#dc3545' : '#555'))
                                : '#444',
                            color: 'white', transition: '0.2s'
                        }}
                    >
                        {renderMedia(opt, true)}
                    </button>
                ))}
            </div>

            {showResult && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <button 
                        onClick={nextQuestion} 
                        style={{ padding: '12px 40px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}
                    >
                        {currentIndex + 1 === questions.length ? "See Results" : "Next Question"}
                    </button>
                </div>
            )}
        </div>
    );
}
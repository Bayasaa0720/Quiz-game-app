import { useState } from 'react';
import './App.css';
import Lobby from './Lobby'; 
import QuizGame from './QuizGame.jsx'; 
import QuizCreator from './QuizCreator.jsx'; 
import QuestionManager from './QuestionManager.jsx'; // Added this back for you

function App() {
    // Possible views: 'MAIN', 'QUIZ', 'CREATE_QUESTION', 'MANAGE_QUESTIONS'
    const [view, setView] = useState('MAIN'); 
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);

    // --- Navigation Handlers ---
    const handleStartQuiz = (categoryId) => {
        setSelectedCategoryId(categoryId);
        setView('QUIZ');
    };

    const handleManageQuestions = (categoryId) => {
        setSelectedCategoryId(categoryId);
        setView('MANAGE_QUESTIONS');
    };

    const goBackToLobby = () => {
        setView('MAIN');
        setSelectedCategoryId(null);
    };

    // --- View Controller ---
    let currentViewContent;

    if (view === 'MAIN') {
        currentViewContent = (
            <Lobby 
                onStartQuiz={handleStartQuiz}
                onCreateQuestion={() => setView('CREATE_QUESTION')}
                onManageQuestions={handleManageQuestions}
            />
        );
    } else if (view === 'QUIZ' && selectedCategoryId) {
        currentViewContent = (
            <QuizGame 
                categoryId={selectedCategoryId} 
                onDone={goBackToLobby} // This fixes your "Return to Lobby" button!
            />
        );
    } else if (view === 'CREATE_QUESTION') {
        currentViewContent = (
            <QuizCreator 
                onDone={goBackToLobby} 
            />
        );
    } else if (view === 'MANAGE_QUESTIONS' && selectedCategoryId) {
        currentViewContent = (
            <QuestionManager 
                categoryId={selectedCategoryId} 
                onDone={goBackToLobby} 
            />
        );
    }

    return (
        <div className="App" style={{ minHeight: '100vh', backgroundColor: '#1a1a1a', color: 'white' }}>
            {/* You can add a global header here if you want */}
            <header style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #333' }}>
                <h1 style={{ margin: 0, color: '#28a745' }}>Flashcard Quiz Master</h1>
            </header>

            <main style={{ padding: '20px' }}>
                {currentViewContent}
            </main>
        </div>
    );
}

export default App;
import { useState } from 'react';
import './App.css';
import Lobby from './Lobby'; 
import QuizGame from './QuizGame.jsx'; 
import QuizCreator from './QuizCreator.jsx'; 
import QuestionManager from './QuestionManager.jsx'; 
import Login from './Login.jsx';
import Register from './register.jsx';

function App() {
    // Possible views: 'LOGIN', 'REGISTER', 'MAIN', 'QUIZ', 'CREATE_QUESTION', 'MANAGE_QUESTIONS'
    const [view, setView] = useState('LOGIN'); 
    const [user, setUser] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);

    // --- Auth Handlers ---
    const handleLoginSuccess = (userData) => {
        setUser(userData);
        setView('MAIN');
    };

    const handleLogout = () => {
        setUser(null);
        setView('LOGIN');
        setSelectedCategoryId(null);
    };

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

    if (view === 'LOGIN') {
        currentViewContent = (
            <Login 
                onLoginSuccess={handleLoginSuccess} 
                onSwitchToRegister={() => setView('REGISTER')} 
            />
        );
    } else if (view === 'REGISTER') {
        currentViewContent = (
            <Register 
                onRegistrationSuccess={() => setView('LOGIN')} 
                onSwitchToLogin={() => setView('LOGIN')} 
            />
        );
    } else if (view === 'MAIN') {
        currentViewContent = (
            <Lobby 
                user={user}
                onLogout={handleLogout}
                onStartQuiz={handleStartQuiz}
                onCreateQuestion={() => setView('CREATE_QUESTION')}
                onManageQuestions={handleManageQuestions}
            />
        );
    } else if (view === 'QUIZ' && selectedCategoryId) {
        currentViewContent = (
            <QuizGame 
                categoryId={selectedCategoryId} 
                onDone={goBackToLobby} 
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
            <header style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #333' }}>
                <h1 style={{ margin: 0, color: '#28a745' }}>Flashcard Quiz Master</h1>
                {user && (
                    <p style={{ color: '#aaa', marginTop: '10px' }}>
                        Welcome, <strong>{user.username}</strong>!
                    </p>
                )}
            </header>

            <main style={{ padding: '20px' }}>
                {currentViewContent}
            </main>
        </div>
    );
}

export default App;
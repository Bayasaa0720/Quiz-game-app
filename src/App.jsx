import { useState, useEffect } from 'react';
import TowerSelect from './TowerSelect.jsx';
import TowerView from './TowerView.jsx';
import Battle from './Battle.jsx';
import QuizCreator from './QuizCreator.jsx';
import QuestionManager from './QuestionManager.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import Login from './Login.jsx';
import Register from './register.jsx';
import { supabase } from './supabaseClient.jsx';
import { ModalProvider } from './components/ModalProvider.jsx';
import { PlayerSidebar, EnemySidebar } from './components/Sidebar.jsx';
import { isMuted, toggleMuted } from './sound.js';
import { useViewportWidth } from './lib/useViewportWidth.js';

// Possible views: 'LOGIN', 'REGISTER', 'TOWER_SELECT', 'TOWER_VIEW', 'BATTLE', 'CREATE_QUESTION', 'MANAGE_QUESTIONS'
const VIEWS_WITH_SIDEBARS = new Set(['TOWER_SELECT', 'TOWER_VIEW', 'BATTLE']);
const IDLE_BATTLE_STATE = {
    playerHP: 100,
    playerMaxHP: 100,
    enemyHP: 100,
    enemyMaxHP: 100,
    playerAnim: 'idle',
    enemyAnim: 'idle',
    playerTick: 0,
    enemyTick: 0,
    enemyVariant: 'orc',
};

function App() {
    const [view, setView] = useState('LOGIN');
    const [user, setUser] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null); // { id, name }
    const [selectedFloor, setSelectedFloor] = useState(null);
    const [battleState, setBattleState] = useState(IDLE_BATTLE_STATE);
    const [checkingSession, setCheckingSession] = useState(true);
    const [sfxMuted, setSfxMuted] = useState(isMuted());
    const viewportWidth = useViewportWidth();

    const handleToggleMute = () => {
        setSfxMuted(toggleMuted());
    };

    // Restore session on refresh, and stay in sync with auth state (e.g. token refresh, sign-out elsewhere)
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user);
                setView('TOWER_SELECT');
            }
            setCheckingSession(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(session.user);
            } else {
                setUser(null);
                setView('LOGIN');
                setSelectedCategory(null);
                setSelectedFloor(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // --- Auth Handlers ---
    const handleLoginSuccess = (userData) => {
        setUser(userData);
        setView('TOWER_SELECT');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setView('LOGIN');
        setSelectedCategory(null);
        setSelectedFloor(null);
    };

    // --- Navigation Handlers ---
    const goToTowerSelect = () => {
        setView('TOWER_SELECT');
        setSelectedCategory(null);
        setSelectedFloor(null);
        setBattleState(IDLE_BATTLE_STATE);
    };

    const handleSelectTower = (categoryId, categoryName) => {
        setSelectedCategory({ id: categoryId, name: categoryName });
        setView('TOWER_VIEW');
    };

    const handleSelectFloor = (floor) => {
        setSelectedFloor(floor);
        setView('BATTLE');
    };

    const handleFloorCleared = () => {
        setSelectedFloor(null);
        setBattleState(IDLE_BATTLE_STATE);
        setView('TOWER_VIEW');
    };

    const handleDefeated = () => {
        goToTowerSelect();
    };

    const handleManageQuestions = (categoryId) => {
        setSelectedCategory({ id: categoryId, name: '' });
        setView('MANAGE_QUESTIONS');
    };

    if (checkingSession) {
        return (
            <div className="app-shell">
                <div className="app-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <p>Ачааллаж байна...</p>
                </div>
            </div>
        );
    }

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
                onRegistrationSuccess={(loggedInUser) => loggedInUser ? handleLoginSuccess(loggedInUser) : setView('LOGIN')}
                onSwitchToLogin={() => setView('LOGIN')}
            />
        );
    } else if (view === 'TOWER_SELECT') {
        currentViewContent = (
            <TowerSelect
                user={user}
                onLogout={handleLogout}
                onSelectTower={handleSelectTower}
                onCreateQuestion={() => setView('CREATE_QUESTION')}
                onManageQuestions={handleManageQuestions}
                onOpenAdminDashboard={() => setView('ADMIN_DASHBOARD')}
            />
        );
    } else if (view === 'ADMIN_DASHBOARD') {
        currentViewContent = <AdminDashboard onBack={goToTowerSelect} />;
    } else if (view === 'TOWER_VIEW' && selectedCategory) {
        currentViewContent = (
            <TowerView
                user={user}
                categoryId={selectedCategory.id}
                categoryName={selectedCategory.name}
                onSelectFloor={handleSelectFloor}
                onBack={goToTowerSelect}
            />
        );
    } else if (view === 'BATTLE' && selectedCategory && selectedFloor) {
        currentViewContent = (
            <Battle
                user={user}
                categoryId={selectedCategory.id}
                floor={selectedFloor}
                onFloorCleared={handleFloorCleared}
                onDefeated={handleDefeated}
                onHpChange={setBattleState}
            />
        );
    } else if (view === 'CREATE_QUESTION') {
        currentViewContent = (
            <QuizCreator
                user={user} // Assign user_id to new categories/questions
                onDone={goToTowerSelect}
            />
        );
    } else if (view === 'MANAGE_QUESTIONS' && selectedCategory) {
        currentViewContent = (
            <QuestionManager
                user={user} // Secure editing: only owner can edit
                categoryId={selectedCategory.id}
                onDone={goToTowerSelect}
            />
        );
    }

    const showSidebars = VIEWS_WITH_SIDEBARS.has(view);
    const inBattle = view === 'BATTLE';
    const characterSize = inBattle && viewportWidth <= 860
        ? (viewportWidth <= 420 ? 34 : 44)
        : undefined;

    return (
        <ModalProvider>
            <div className="app-shell">
                <header className="app-header">
                    <h1>Flashcard Quiz Master</h1>
                    <div className="app-header-right">
                        {user && (
                            <p className="app-user">Хэрэглэгч: <strong>{user.email}</strong></p>
                        )}
                        <button
                            type="button"
                            className="mute-toggle"
                            onClick={handleToggleMute}
                            aria-label={sfxMuted ? 'Дуу асаах' : 'Дуу хаах'}
                            title={sfxMuted ? 'Дуу асаах' : 'Дуу хаах'}
                        >
                            {sfxMuted ? '🔇' : '🔊'}
                        </button>
                    </div>
                </header>

                <div className={`app-body${showSidebars ? ' with-sidebars' : ''}${inBattle ? ' in-battle' : ''}`}>
                    {showSidebars && (
                        <PlayerSidebar
                            hp={inBattle ? battleState.playerHP : undefined}
                            maxHp={inBattle ? battleState.playerMaxHP : undefined}
                            note={inBattle ? undefined : 'Тулаан эхлээгүй байна'}
                            anim={inBattle ? battleState.playerAnim : 'idle'}
                            tick={inBattle ? battleState.playerTick : 0}
                            size={characterSize}
                        />
                    )}
                    <main className="app-main">
                        {currentViewContent}
                    </main>
                    {showSidebars && (
                        <EnemySidebar
                            hp={inBattle ? battleState.enemyHP : undefined}
                            maxHp={inBattle ? battleState.enemyMaxHP : undefined}
                            note={inBattle ? undefined : 'Тулаан эхлээгүй байна'}
                            anim={inBattle ? battleState.enemyAnim : 'idle'}
                            tick={inBattle ? battleState.enemyTick : 0}
                            variant={inBattle ? battleState.enemyVariant : 'orc'}
                            size={characterSize}
                        />
                    )}
                </div>
            </div>
        </ModalProvider>
    );
}

export default App;

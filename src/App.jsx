import { useState, useEffect, Suspense, lazy } from 'react';
import TowerSelect from './TowerSelect.jsx';
import TowerView from './TowerView.jsx';
import Battle from './Battle.jsx';
import QuizCreator from './QuizCreator.jsx';
import QuestionManager from './QuestionManager.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import Leaderboard from './Leaderboard.jsx';
import Friends from './Friends.jsx';
import TeacherDashboard from './TeacherDashboard.jsx';
import Duel from './Duel.jsx';
import DuelHistory from './DuelHistory.jsx';
import Inventory from './Inventory.jsx';
import Shop from './Shop.jsx';
import Profile from './Profile.jsx';
import Achievements from './Achievements.jsx';
import ManageContent from './ManageContent.jsx';
import Login from './Login.jsx';
import Register from './register.jsx';
import { supabase } from './supabaseClient.jsx';
import { ModalProvider } from './components/ModalProvider.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';
import { PlayerSidebar, EnemySidebar } from './components/Sidebar.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import { isMuted, toggleMuted } from './sound.js';
import { useViewportWidth } from './lib/useViewportWidth.js';

// papaparse/xlsx (bulk import) are heavy and rarely needed — load on demand.
const BulkImport = lazy(() => import('./BulkImport.jsx'));

// Possible views: 'LOGIN', 'REGISTER', 'TOWER_SELECT', 'TOWER_VIEW', 'BATTLE', 'CREATE_QUESTION', 'MANAGE_QUESTIONS'
const VIEWS_WITH_SIDEBARS = new Set(['BATTLE']);
const IDLE_BATTLE_STATE = {
    playerHP: 100,
    playerMaxHP: 100,
    armorHP: 0,
    armorMax: 0,
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
    const [userRole, setUserRole] = useState(null); // 'student' | 'teacher'
    const [duelInvite, setDuelInvite] = useState(null); // { matchId, isChallengeAccept } | null
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
                setUserRole(null);
                setView('LOGIN');
                setSelectedCategory(null);
                setSelectedFloor(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Signup-ийн үед сонгосон role (user_metadata дотор хадгалагддаг, session
    // байгаагүй ч алдагдахгүй) — эхний удаа нэвтрэхэд user_profiles мөр
    // болгож бэхжүүлнэ. upsert(ignoreDuplicates) тул давхар дуудахад аюулгүй
    // бөгөөд role-ыг хожим дахин бичихгүй (тогтмол үлдэнэ).
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            const { data } = await supabase.from('user_profiles').select('role').eq('user_id', user.id).maybeSingle();
            if (cancelled) return;
            if (data) {
                setUserRole(data.role);
                return;
            }
            const role = user.user_metadata?.role === 'teacher' ? 'teacher' : 'student';
            await supabase.from('user_profiles').upsert(
                { user_id: user.id, role },
                { onConflict: 'user_id', ignoreDuplicates: true }
            );
            if (!cancelled) setUserRole(role);
        })();
        return () => { cancelled = true; };
    }, [user]);

    // --- Auth Handlers ---
    const handleLoginSuccess = (userData) => {
        setUser(userData);
        setView('TOWER_SELECT');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setUserRole(null);
        setView('LOGIN');
        setSelectedCategory(null);
        setSelectedFloor(null);
    };

    // --- Navigation Handlers ---
    const goToTowerSelect = () => {
        setView('TOWER_SELECT');
        setSelectedCategory(null);
        setSelectedFloor(null);
        setDuelInvite(null);
        setBattleState(IDLE_BATTLE_STATE);
    };

    // Профайл дотроос нээгддэг дэд дэлгэцүүд (achievements, leaderboard,
    // friends г.м.) буцахдаа шууд цамхаг руу биш, hub руугаа буцна.
    const goToProfile = () => setView('PROFILE');

    // Мөн адил "Агуулга удирдах" дотроос нээгддэг дэд дэлгэцүүд.
    const goToManageContent = () => setView('MANAGE_CONTENT');

    const handleSelectTower = (categoryId, categoryName) => {
        setSelectedCategory({ id: categoryId, name: categoryName });
        setView('TOWER_VIEW');
    };

    const handleSelectFloor = (floor) => {
        setSelectedFloor(floor);
        setView('BATTLE');
    };

    const handleStartDuel = (categoryId, categoryName) => {
        setSelectedCategory({ id: categoryId, name: categoryName });
        setDuelInvite(null);
        setView('DUEL');
    };

    // Friends.jsx-ээс найзаа урьсны дараа — challenge аль хэдийн үүссэн
    // тул Duel.jsx нээлттэй queue хайхгүй, шууд тэр match-руу орно.
    const handleChallengeCreated = (matchId, categoryId, categoryName) => {
        setSelectedCategory({ id: categoryId, name: categoryName });
        setDuelInvite({ matchId, isChallengeAccept: false });
        setView('DUEL');
    };

    // TowerSelect дэх "Тоглох" товч дарахад ирсэн урилгыг хүлээн авна.
    const handleAcceptChallenge = (matchId, categoryId, categoryName) => {
        setSelectedCategory({ id: categoryId, name: categoryName });
        setDuelInvite({ matchId, isChallengeAccept: true });
        setView('DUEL');
    };

    const handleFloorCleared = () => {
        setSelectedFloor(null);
        setBattleState(IDLE_BATTLE_STATE);
        setView('TOWER_VIEW');
    };

    // Jump straight into the next floor from the "won" screen — stays on
    // the BATTLE view, just swaps which floor prop Battle gets, so its
    // loadFloor effect (which depends on `floor`) picks up the new one.
    const handleGoToFloor = (nextFloor) => {
        setSelectedFloor(nextFloor);
        setBattleState(IDLE_BATTLE_STATE);
    };

    const handleManageQuestions = (categoryId) => {
        setSelectedCategory({ id: categoryId, name: '' });
        setView('MANAGE_QUESTIONS');
    };

    const handleBulkImport = (categoryId) => {
        setSelectedCategory({ id: categoryId, name: '' });
        setView('BULK_IMPORT');
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
                onOpenProfile={goToProfile}
                onOpenManageContent={() => setView('MANAGE_CONTENT')}
                onAcceptChallenge={handleAcceptChallenge}
            />
        );
    } else if (view === 'PROFILE') {
        currentViewContent = (
            <Profile
                user={user}
                userRole={userRole}
                onBack={goToTowerSelect}
                onOpenAchievements={() => setView('ACHIEVEMENTS')}
                onOpenLeaderboard={() => setView('LEADERBOARD')}
                onOpenFriends={() => setView('FRIENDS')}
                onOpenDuelHistory={() => setView('DUEL_HISTORY')}
                onOpenInventory={() => setView('INVENTORY')}
                onOpenShop={() => setView('SHOP')}
                onOpenClassrooms={() => setView('CLASSROOMS')}
                onOpenAdminDashboard={() => setView('ADMIN_DASHBOARD')}
            />
        );
    } else if (view === 'MANAGE_CONTENT') {
        currentViewContent = (
            <ManageContent
                user={user}
                onBack={goToTowerSelect}
                onCreateQuestion={() => setView('CREATE_QUESTION')}
                onManageQuestions={handleManageQuestions}
                onBulkImport={handleBulkImport}
            />
        );
    } else if (view === 'ACHIEVEMENTS') {
        currentViewContent = <Achievements userId={user?.id} onBack={goToProfile} />;
    } else if (view === 'ADMIN_DASHBOARD') {
        currentViewContent = <AdminDashboard onBack={goToProfile} />;
    } else if (view === 'LEADERBOARD') {
        currentViewContent = <Leaderboard user={user} onBack={goToProfile} />;
    } else if (view === 'FRIENDS') {
        currentViewContent = <Friends user={user} onBack={goToProfile} onChallengeCreated={handleChallengeCreated} />;
    } else if (view === 'INVENTORY') {
        currentViewContent = <Inventory user={user} onBack={goToProfile} />;
    } else if (view === 'SHOP') {
        currentViewContent = <Shop user={user} onBack={goToProfile} />;
    } else if (view === 'DUEL_HISTORY') {
        currentViewContent = <DuelHistory onBack={goToProfile} />;
    } else if (view === 'CLASSROOMS') {
        currentViewContent = <TeacherDashboard user={user} onBack={goToProfile} />;
    } else if (view === 'TOWER_VIEW' && selectedCategory) {
        currentViewContent = (
            <TowerView
                user={user}
                categoryId={selectedCategory.id}
                categoryName={selectedCategory.name}
                onSelectFloor={handleSelectFloor}
                onStartDuel={handleStartDuel}
                onBack={goToTowerSelect}
            />
        );
    } else if (view === 'DUEL' && selectedCategory) {
        currentViewContent = (
            <Duel
                user={user}
                categoryId={selectedCategory.id}
                categoryName={selectedCategory.name}
                matchId={duelInvite?.matchId}
                isChallengeAccept={duelInvite?.isChallengeAccept}
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
                onGoToFloor={handleGoToFloor}
                onLeaveTower={goToTowerSelect}
                onHpChange={setBattleState}
            />
        );
    } else if (view === 'CREATE_QUESTION') {
        currentViewContent = (
            <QuizCreator
                user={user} // Assign user_id to new categories/questions
                onDone={goToManageContent}
            />
        );
    } else if (view === 'MANAGE_QUESTIONS' && selectedCategory) {
        currentViewContent = (
            <QuestionManager
                user={user} // Secure editing: only owner can edit
                categoryId={selectedCategory.id}
                onDone={goToManageContent}
            />
        );
    } else if (view === 'BULK_IMPORT' && selectedCategory) {
        currentViewContent = (
            <Suspense fallback={<p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>}>
                <BulkImport
                    user={user}
                    categoryId={selectedCategory.id}
                    onDone={goToManageContent}
                />
            </Suspense>
        );
    }

    const showSidebars = VIEWS_WITH_SIDEBARS.has(view);
    const inBattle = view === 'BATTLE';
    const characterSize = inBattle && viewportWidth <= 860
        ? (viewportWidth <= 420 ? 50 : 62)
        : undefined;

    return (
        <ToastProvider>
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
                                armor={inBattle ? battleState.armorHP : undefined}
                                armorMax={inBattle ? battleState.armorMax : undefined}
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
                <InstallPrompt />
            </ModalProvider>
        </ToastProvider>
    );
}

export default App;

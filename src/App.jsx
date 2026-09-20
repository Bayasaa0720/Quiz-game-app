import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import TowerSelect from './TowerSelect.jsx';
import TowerView from './TowerView.jsx';
import Battle from './Battle.jsx';
import QuizCreator from './QuizCreator.jsx';
import QuestionManager from './QuestionManager.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import Leaderboard from './Leaderboard.jsx';
import Friends from './Friends.jsx';
import Learning from './Learning.jsx';
import Duel from './Duel.jsx';
import DuelHistory from './DuelHistory.jsx';
import Inventory from './Inventory.jsx';
import Shop from './Shop.jsx';
import Profile from './Profile.jsx';
import ManageContent from './ManageContent.jsx';
import Login from './Login.jsx';
import Register from './register.jsx';
import { supabase } from './supabaseClient.jsx';
import { ModalProvider } from './components/ModalProvider.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';
import { PlayerSidebar, EnemySidebar } from './components/Sidebar.jsx';
import NavSidebar from './components/NavSidebar.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import { isMuted, toggleMuted } from './sound.js';
import { formatCoin } from './lib/formatCoin.js';
import { useViewportWidth } from './lib/useViewportWidth.js';

// papaparse/xlsx (bulk import) are heavy and rarely needed — load on demand.
const BulkImport = lazy(() => import('./BulkImport.jsx'));

const VIEWS_WITH_BATTLE_SIDEBARS = new Set(['BATTLE']);
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

// Аль view "hub" бүлэгт (тогтмол sidebar-тай) багтахыг тодорхойлно. Battle,
// TowerView, Duel тоглолт, асуулт CRUD урсгал зэрэг "gameplay drill-down"
// горимууд sidebar-гүй, бүтэн дэлгэцээрээ л явна.
function viewToNavSection(view) {
    if (['TOWER_SELECT', 'LEADERBOARD', 'MANAGE_CONTENT'].includes(view)) return 'tower';
    if (['SHOP', 'INVENTORY'].includes(view)) return 'shop';
    if (view === 'DUEL_HISTORY') return 'duel';
    if (view === 'FRIENDS') return 'friends';
    if (view === 'LEARNING') return 'learning';
    if (view === 'ADMIN_DASHBOARD') return 'admin';
    return null;
}

function App() {
    const [view, setView] = useState('LOGIN');
    const [user, setUser] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null); // { id, name }
    const [selectedFloor, setSelectedFloor] = useState(null);
    const [battleState, setBattleState] = useState(IDLE_BATTLE_STATE);
    const [checkingSession, setCheckingSession] = useState(true);
    const [sfxMuted, setSfxMuted] = useState(isMuted());
    const [userRole, setUserRole] = useState(null); // 'student' | 'teacher'
    const [isAdmin, setIsAdmin] = useState(false);
    const [displayName, setDisplayName] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [coinBalance, setCoinBalance] = useState(0);
    const [duelInvite, setDuelInvite] = useState(null); // { matchId, isChallengeAccept } | null
    const viewportWidth = useViewportWidth();

    const handleToggleMute = () => {
        setSfxMuted(toggleMuted());
    };

    const refreshCoinBalance = useCallback(async (uid) => {
        if (!uid) return;
        const { data } = await supabase.from('user_points').select('balance').eq('user_id', uid).maybeSingle();
        setCoinBalance(data?.balance || 0);
    }, []);

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
                setIsAdmin(false);
                setDisplayName(null);
                setAvatarUrl(null);
                setCoinBalance(0);
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
    // бөгөөд role-ыг хожим дахин бичихгүй (тогтмол үлдэнэ). Мөн энд л
    // header-т байнга харагдах display_name/avatar_url-ыг татна.
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            const { data } = await supabase.from('user_profiles').select('role, display_name, avatar_url').eq('user_id', user.id).maybeSingle();
            if (cancelled) return;
            if (data) {
                setUserRole(data.role);
                setDisplayName(data.display_name || null);
                setAvatarUrl(data.avatar_url || null);
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

    useEffect(() => {
        if (!user) return;
        (async () => {
            const { data, error } = await supabase.rpc('is_app_admin');
            if (!error) setIsAdmin(!!data);
            await refreshCoinBalance(user.id);
        })();
    }, [user, refreshCoinBalance]);

    // --- Auth Handlers ---
    const handleLoginSuccess = (userData) => {
        setUser(userData);
        setView('TOWER_SELECT');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setUserRole(null);
        setIsAdmin(false);
        setDisplayName(null);
        setAvatarUrl(null);
        setCoinBalance(0);
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
        refreshCoinBalance(user?.id);
    };

    const goToProfile = () => {
        setView('PROFILE');
        refreshCoinBalance(user?.id);
    };

    // "Агуулга удирдах" дотроос нээгддэг дэд дэлгэцүүд эндээ буцна.
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
        refreshCoinBalance(user?.id);
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

    const handleProfileUpdated = ({ displayName: newName, avatarUrl: newAvatar }) => {
        setDisplayName(newName);
        setAvatarUrl(newAvatar);
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
                onSelectTower={handleSelectTower}
                onAcceptChallenge={handleAcceptChallenge}
            />
        );
    } else if (view === 'PROFILE') {
        currentViewContent = (
            <Profile
                user={user}
                userRole={userRole}
                onBack={goToTowerSelect}
                onLogout={handleLogout}
                onProfileUpdated={handleProfileUpdated}
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
    } else if (view === 'ADMIN_DASHBOARD') {
        currentViewContent = <AdminDashboard onBack={goToTowerSelect} />;
    } else if (view === 'LEADERBOARD') {
        currentViewContent = <Leaderboard user={user} onBack={goToTowerSelect} />;
    } else if (view === 'FRIENDS') {
        currentViewContent = <Friends user={user} onBack={goToTowerSelect} onChallengeCreated={handleChallengeCreated} />;
    } else if (view === 'INVENTORY') {
        currentViewContent = <Inventory user={user} onBack={goToTowerSelect} />;
    } else if (view === 'SHOP') {
        currentViewContent = <Shop user={user} onBack={goToTowerSelect} />;
    } else if (view === 'DUEL_HISTORY') {
        currentViewContent = <DuelHistory onBack={goToTowerSelect} />;
    } else if (view === 'LEARNING') {
        currentViewContent = <Learning user={user} userRole={userRole} onBack={goToTowerSelect} />;
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

    const showBattleSidebars = VIEWS_WITH_BATTLE_SIDEBARS.has(view);
    const inBattle = view === 'BATTLE';
    const characterSize = inBattle && viewportWidth <= 860
        ? (viewportWidth <= 420 ? 50 : 62)
        : undefined;

    const activeNavSection = viewToNavSection(view);
    const navSidebarItems = {
        tower: [
            { label: '🗼 Цамхагууд', view: 'TOWER_SELECT', onClick: goToTowerSelect },
            { label: '🏆 Тэргүүлэгчид', view: 'LEADERBOARD', onClick: () => setView('LEADERBOARD') },
            { label: '📝 Агуулга удирдах', view: 'MANAGE_CONTENT', onClick: goToManageContent },
        ],
        shop: [
            { label: '🛒 Дэлгүүр', view: 'SHOP', onClick: () => setView('SHOP') },
            { label: '🎒 Инвентар', view: 'INVENTORY', onClick: () => setView('INVENTORY') },
        ],
        duel: [
            { label: '📜 Дуэлийн түүх', view: 'DUEL_HISTORY', onClick: () => setView('DUEL_HISTORY') },
            { label: '👥 Найзаа урих', view: 'FRIENDS', onClick: () => setView('FRIENDS') },
        ],
        friends: [
            { label: '👥 Найзууд', view: 'FRIENDS', onClick: () => setView('FRIENDS') },
        ],
        learning: [
            { label: '🎓 Сургалт', view: 'LEARNING', onClick: () => setView('LEARNING') },
        ],
        admin: [
            { label: '🛠 Бүх цамхаг', view: 'ADMIN_DASHBOARD', onClick: () => setView('ADMIN_DASHBOARD') },
        ],
    }[activeNavSection];

    return (
        <ToastProvider>
            <ModalProvider>
                <div className="app-shell">
                    <header className="app-header">
                        <button type="button" className="app-logo" onClick={user ? goToTowerSelect : undefined}>
                            🗼 Tower Climb
                        </button>

                        {user && (
                            <nav className="app-nav-tabs">
                                <button type="button" className={activeNavSection === 'shop' ? 'active' : ''} onClick={() => setView('SHOP')}>🛒 Дэлгүүр</button>
                                <button type="button" className={activeNavSection === 'duel' ? 'active' : ''} onClick={() => setView('DUEL_HISTORY')}>⚔️ Duel</button>
                                <button type="button" className={activeNavSection === 'friends' ? 'active' : ''} onClick={() => setView('FRIENDS')}>👥 Найзууд</button>
                                <button type="button" className={activeNavSection === 'learning' ? 'active' : ''} onClick={() => setView('LEARNING')}>🎓 Сургалт</button>
                                {isAdmin && (
                                    <button type="button" className={activeNavSection === 'admin' ? 'active' : ''} onClick={() => setView('ADMIN_DASHBOARD')}>🛠 Admin</button>
                                )}
                            </nav>
                        )}

                        <div className="app-header-right">
                            {user && <span className="app-coin-pill">🪙 {formatCoin(coinBalance)}</span>}
                            <button
                                type="button"
                                className="mute-toggle"
                                onClick={handleToggleMute}
                                aria-label={sfxMuted ? 'Дуу асаах' : 'Дуу хаах'}
                                title={sfxMuted ? 'Дуу асаах' : 'Дуу хаах'}
                            >
                                {sfxMuted ? '🔇' : '🔊'}
                            </button>
                            {user && (
                                <button type="button" className="app-avatar-btn" onClick={goToProfile} title="Профайл">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Профайл" />
                                    ) : (
                                        <span>{(displayName || user.email || '?').charAt(0).toUpperCase()}</span>
                                    )}
                                </button>
                            )}
                        </div>
                    </header>

                    <div className={`app-body${showBattleSidebars ? ' with-sidebars' : ''}${inBattle ? ' in-battle' : ''}${navSidebarItems ? ' with-nav-sidebar' : ''}`}>
                        {showBattleSidebars && (
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
                        {navSidebarItems && <NavSidebar items={navSidebarItems} activeView={view} />}
                        <main className="app-main">
                            {currentViewContent}
                        </main>
                        {showBattleSidebars && (
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

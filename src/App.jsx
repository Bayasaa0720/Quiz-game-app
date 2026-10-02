import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import Home from './Home.jsx';
import TowerView from './TowerView.jsx';
import Battle from './Battle.jsx';
import QuizCreator from './QuizCreator.jsx';
import QuestionManager from './QuestionManager.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import Leaderboard from './Leaderboard.jsx';
import FriendsDuel from './FriendsDuel.jsx';
import Learning from './Learning.jsx';
import Duel from './Duel.jsx';
import Inventory from './Inventory.jsx';
import Shop from './Shop.jsx';
import Profile from './Profile.jsx';
import ManageContent from './ManageContent.jsx';
import Onboarding from './Onboarding.jsx';
import { supabase } from './supabaseClient.jsx';
import { ModalProvider } from './components/ModalProvider.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { PlayerSidebar, EnemySidebar } from './components/Sidebar.jsx';
import MainSidebar from './components/MainSidebar.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import Button from './components/Button.jsx';
import { isMuted, toggleMuted } from './sound.js';
import { formatCoin } from './lib/formatCoin.js';
import { useViewportWidth } from './lib/useViewportWidth.js';
import { HOME_NAV_VIEWS } from './lib/navViews.js';

// papaparse/xlsx (bulk import) are heavy and rarely needed — load on demand.
const BulkImport = lazy(() => import('./BulkImport.jsx'));

const VIEWS_WITH_BATTLE_SIDEBARS = new Set(['BATTLE']);
// Зочны горимд зөвхөн World tower тоглох боломжтой (2026-09-26 шийдвэр) —
// бусад бүх дэлгэц GuestGate-ээр орлогдоно.
const GUEST_ALLOWED_VIEWS = new Set(['TOWER_SELECT', 'TOWER_VIEW', 'BATTLE']);
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
    const [view, setView] = useState('ONBOARDING');
    const [user, setUser] = useState(null);
    const [isGuest, setIsGuest] = useState(false);
    // Зочны горимын явц — зөвхөн энэ session-д амьдрах ephemeral state,
    // DB-д хэзээ ч бичигдэхгүй (2026-09-26 шийдвэр). { [categoryId]: highestClearedFloor }
    const [guestProgress, setGuestProgress] = useState({});
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
    const [streak, setStreak] = useState(0);
    const [equippedArmor, setEquippedArmor] = useState(null); // { name, icon, armor_points } | null
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

    // MainSidebar-ийн доод хэсэгт одоогийн идэвхжүүлсэн армороо товч
    // харуулахад ашиглана (шинэ дэлгэц/route биш, зөвхөн харуулалт).
    const refreshEquippedArmor = useCallback(async (uid) => {
        if (!uid) return;
        const { data } = await supabase.rpc('get_my_equipped_armor');
        setEquippedArmor(data?.[0] || null);
    }, []);

    // Header-т "N хоног" streak pill — battle_attempts_log-оос сервер талд
    // тооцоологдоно (шинэ хүснэгт хэрэггүй, supabase/streak.sql харна уу).
    const refreshStreak = useCallback(async (uid) => {
        if (!uid) return;
        const { data, error } = await supabase.rpc('get_my_streak');
        if (!error) setStreak(Number(data) || 0);
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
                setView('ONBOARDING');
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
            const displayNameFromSignup = user.user_metadata?.display_name || null;
            await supabase.from('user_profiles').upsert(
                { user_id: user.id, role, display_name: displayNameFromSignup },
                { onConflict: 'user_id', ignoreDuplicates: true }
            );
            if (!cancelled) {
                setUserRole(role);
                setDisplayName(displayNameFromSignup);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    useEffect(() => {
        if (!user) return;
        (async () => {
            const { data, error } = await supabase.rpc('is_app_admin');
            if (!error) setIsAdmin(!!data);
            await Promise.all([refreshCoinBalance(user.id), refreshEquippedArmor(user.id), refreshStreak(user.id)]);
        })();
    }, [user, refreshCoinBalance, refreshEquippedArmor, refreshStreak]);

    // --- Auth Handlers ---
    // Onboarding wizard-ийн 3-р алхам (нэвтрэх/бүртгүүлэх) аль хэдийн
    // танилцуулга/дүрмийг дараад ирсэн тул энд дахин шалгах зүйлгүй.
    const handleAuthSuccess = (userData) => {
        setUser(userData);
        setIsGuest(false);
        setView('TOWER_SELECT');
    };

    const handleGuestContinue = () => {
        setIsGuest(true);
        setGuestProgress({});
        setView('TOWER_SELECT');
    };

    // Зочин "Бүртгүүлэх" дарахад — Onboarding аль хэдийн танилцуулгыг
    // харуулсан тул шууд 3-р алхам (auth формоос) руу очно.
    const handleGuestRegister = () => {
        setIsGuest(false);
        setView('ONBOARDING');
    };

    const handleGuestFloorCleared = (categoryId, floorIndex) => {
        setGuestProgress(g => ({ ...g, [categoryId]: Math.max(g[categoryId] ?? -1, floorIndex) }));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setIsGuest(false);
        setGuestProgress({});
        setUserRole(null);
        setIsAdmin(false);
        setDisplayName(null);
        setAvatarUrl(null);
        setCoinBalance(0);
        setStreak(0);
        setView('ONBOARDING');
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
        refreshEquippedArmor(user?.id);
        refreshStreak(user?.id);
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
        refreshStreak(user?.id);
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

    if (view === 'ONBOARDING') {
        currentViewContent = <Onboarding onAuthSuccess={handleAuthSuccess} onGuestContinue={handleGuestContinue} />;
    } else if (view === 'TOWER_SELECT') {
        currentViewContent = (
            <Home
                user={user}
                isGuest={isGuest}
                guestProgress={guestProgress}
                displayName={displayName}
                onSelectTower={handleSelectTower}
                onAcceptChallenge={handleAcceptChallenge}
                onOpenLeaderboard={() => setView('LEADERBOARD')}
                onCreateTower={goToManageContent}
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
                sfxMuted={sfxMuted}
                onToggleMute={handleToggleMute}
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
        currentViewContent = <FriendsDuel user={user} onBack={goToTowerSelect} onChallengeCreated={handleChallengeCreated} />;
    } else if (view === 'INVENTORY') {
        currentViewContent = <Inventory user={user} onBack={goToTowerSelect} />;
    } else if (view === 'SHOP') {
        currentViewContent = <Shop user={user} onBack={goToTowerSelect} />;
    } else if (view === 'LEARNING') {
        currentViewContent = <Learning user={user} userRole={userRole} onBack={goToTowerSelect} />;
    } else if (view === 'TOWER_VIEW' && selectedCategory) {
        currentViewContent = (
            <TowerView
                user={user}
                isGuest={isGuest}
                guestHighestCleared={guestProgress[selectedCategory.id] ?? -1}
                categoryId={selectedCategory.id}
                categoryName={selectedCategory.name}
                equippedArmor={equippedArmor}
                isAdmin={isAdmin}
                onSelectFloor={handleSelectFloor}
                onStartDuel={handleStartDuel}
                onBack={goToTowerSelect}
                onOpenInventory={() => setView('INVENTORY')}
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
                isGuest={isGuest}
                onGuestFloorCleared={handleGuestFloorCleared}
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

    // Зочин зөвхөн World tower тоглох ёстой (2026-09-26 шийдвэр) — бусад
    // бүх дэлгэц дээр (Profile/Shop/Friends/Learning/Admin г.м) энгийн
    // "бүртгүүлэх" уриалгаар орлуулна. currentViewContent аль хэдийн бүтсэн
    // ч JSX element зөвхөн render хийгдэхдээ л биелдэг тул энд дарж бичихэд
    // доорх салбарууд (жиш нь <Profile user={null}/>) хэзээ ч дуудагдахгүй.
    if (isGuest && !GUEST_ALLOWED_VIEWS.has(view)) {
        currentViewContent = (
            <div className="guest-gate">
                <h2>🔒 Энэ хэсэг зөвхөн бүртгэлтэй хэрэглэгчид зориулагдсан</h2>
                <p>Зочны горимд зөвхөн World tower тоглох боломжтой. Бүх боломжийг нээхийн тулд бүртгүүлнэ үү.</p>
                <div className="guest-gate-actions">
                    <Button onClick={handleGuestRegister}>Бүртгүүлэх</Button>
                    <Button variant="ghost" onClick={goToTowerSelect}>← Нүүр рүү буцах</Button>
                </div>
            </div>
        );
    }

    const showBattleSidebars = VIEWS_WITH_BATTLE_SIDEBARS.has(view);
    const inBattle = view === 'BATTLE';
    const characterSize = inBattle && viewportWidth <= 860
        ? (viewportWidth <= 420 ? 50 : 62)
        : undefined;

    const showMainNav = (user || isGuest) && view !== 'ONBOARDING';
    // Battle-ийн зүүн/баруун HP багана аль хэдийн байгаа тул зөвхөн тэнд
    // тогтмол sidebar-аа нуугаад, header дэх mobile fallback nav-аар хангана.
    const showMainSidebar = showMainNav && view !== 'BATTLE';

    return (
        <ToastProvider>
            <ModalProvider>
                <div className={`app-shell${showMainSidebar ? ' has-main-sidebar' : ''}`}>
                    <header className="app-header">
                        <button type="button" className="app-logo" onClick={(user || isGuest) ? goToTowerSelect : undefined}>
                            🗼 Tower Climb
                        </button>

                        {showMainNav && (
                            // Зөвхөн mobile fallback (desktop дээр MainSidebar-аар
                            // нуугдана, CSS: .app-nav-tabs { display:none } @900px+).
                            <nav className="app-nav-tabs">
                                <button type="button" className={HOME_NAV_VIEWS.has(view) ? 'active' : ''} onClick={goToTowerSelect}>🗼 Цамхагууд</button>
                                <button type="button" className={view === 'SHOP' || view === 'INVENTORY' ? 'active' : ''} onClick={() => setView('SHOP')}>🛒 Дэлгүүр</button>
                                <button type="button" className={view === 'FRIENDS' ? 'active' : ''} onClick={() => setView('FRIENDS')}>👥 Найзууд ба Duel</button>
                                <button type="button" className={view === 'LEARNING' ? 'active' : ''} onClick={() => setView('LEARNING')}>🎓 Сургалт</button>
                                {isAdmin && (
                                    <button type="button" className={view === 'ADMIN_DASHBOARD' ? 'active' : ''} onClick={() => setView('ADMIN_DASHBOARD')}>🛠 Admin</button>
                                )}
                            </nav>
                        )}

                        <div className="app-header-right">
                            {user && view !== 'ONBOARDING' && <span className="app-coin-pill">🪙 {formatCoin(coinBalance)}</span>}
                            {user && view !== 'ONBOARDING' && streak > 0 && <span className="app-streak-pill">🔥 {streak} хоног</span>}
                            <button
                                type="button"
                                className="mute-toggle"
                                onClick={handleToggleMute}
                                aria-label={sfxMuted ? 'Дуу асаах' : 'Дуу хаах'}
                                title={sfxMuted ? 'Дуу асаах' : 'Дуу хаах'}
                            >
                                {sfxMuted ? '🔇' : '🔊'}
                            </button>
                            {user && view !== 'ONBOARDING' && (
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

                    <div className={`app-body${showBattleSidebars ? ' with-sidebars' : ''}${inBattle ? ' in-battle' : ''}${showMainSidebar ? ' with-main-sidebar' : ''}`}>
                        {showMainSidebar && (
                            <MainSidebar
                                activeView={view}
                                isAdmin={isAdmin}
                                isGuest={isGuest}
                                equippedArmor={equippedArmor}
                                displayName={isGuest ? 'Зочин' : displayName}
                                userEmail={user?.email}
                                userRole={userRole}
                                onHome={goToTowerSelect}
                                onLeaderboard={() => setView('LEADERBOARD')}
                                onFriends={() => setView('FRIENDS')}
                                onLearning={() => setView('LEARNING')}
                                onManageContent={goToManageContent}
                                onShop={() => setView('SHOP')}
                                onInventory={() => setView('INVENTORY')}
                                onAdmin={() => setView('ADMIN_DASHBOARD')}
                                onProfile={goToProfile}
                                onGuestRegister={handleGuestRegister}
                            />
                        )}
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
                        <main className="app-main">
                            <ErrorBoundary key={view}>
                                {currentViewContent}
                            </ErrorBoundary>
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
                {view !== 'ONBOARDING' && <InstallPrompt />}
            </ModalProvider>
        </ToastProvider>
    );
}

export default App;

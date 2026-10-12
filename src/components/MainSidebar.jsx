import './MainSidebar.css';
import { HOME_NAV_VIEWS } from '../lib/navViews.js';

// Тогтмол зүүн sidebar (Tower Climb App.html deck-ийн дагуу) — хуучин
// app-nav-tabs (header дэх) + NavSidebar (section-контекст дэд цэс)-ийг
// орлоно. Desktop дээр л харагдана; mobile дээр CSS-ээр нуугдаж,
// App.jsx-ийн хуучин app-nav-tabs эргэн харагдана (mobile fallback nav).
export default function MainSidebar({
    activeView,
    isAdmin,
    isGuest,
    equippedArmor,
    displayName,
    userEmail,
    userRole,
    onHome,
    onLeaderboard,
    onFriends,
    onLearning,
    onMyTowers,
    onShop,
    onInventory,
    onAdmin,
    onProfile,
    onGuestRegister,
}) {
    const isActive = (...views) => views.includes(activeView);
    // Зочин зөвхөн World tower тоглох боломжтой (Нүүр/Тэргүүлэгчид харагдана,
    // бусад товч дарахад App.jsx-ийн GuestGate-рүү орно) — түгжээтэй гэдгийг
    // энд зөвхөн icon-оор мэдэгдэнэ.
    const lock = isGuest ? <span className="main-sidebar-lock" aria-hidden="true">🔒</span> : null;

    return (
        <nav className="main-sidebar" aria-label="Main navigation">
            <button type="button" className="main-sidebar-logo" onClick={onHome}>
                🗼 Tower Climb
            </button>

            <div className="main-sidebar-items">
                <span className="main-sidebar-group-label">Play</span>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive(...HOME_NAV_VIEWS) ? ' active' : ''}`}
                    aria-current={isActive(...HOME_NAV_VIEWS) ? 'page' : undefined}
                    onClick={onHome}
                >
                    🏠 Home
                </button>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('LEADERBOARD') ? ' active' : ''}`}
                    aria-current={isActive('LEADERBOARD') ? 'page' : undefined}
                    onClick={onLeaderboard}
                >
                    🏆 Leaderboard {lock}
                </button>

                <span className="main-sidebar-group-label">Social</span>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('FRIENDS') ? ' active' : ''}`}
                    aria-current={isActive('FRIENDS') ? 'page' : undefined}
                    onClick={onFriends}
                >
                    👥 Friends & Duel {lock}
                </button>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('LEARNING') ? ' active' : ''}`}
                    aria-current={isActive('LEARNING') ? 'page' : undefined}
                    onClick={onLearning}
                >
                    🎓 Classes {lock}
                </button>

                <span className="main-sidebar-group-label">Create</span>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('MY_TOWERS', 'MANAGE_CONTENT', 'CREATE_QUESTION', 'MANAGE_QUESTIONS', 'BULK_IMPORT') ? ' active' : ''}`}
                    aria-current={isActive('MY_TOWERS', 'MANAGE_CONTENT', 'CREATE_QUESTION', 'MANAGE_QUESTIONS', 'BULK_IMPORT') ? 'page' : undefined}
                    onClick={onMyTowers}
                >
                    🗼 My Towers {lock}
                </button>

                <span className="main-sidebar-group-label">Store</span>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('SHOP') ? ' active' : ''}`}
                    aria-current={isActive('SHOP') ? 'page' : undefined}
                    onClick={onShop}
                >
                    🛒 Shop {lock}
                </button>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('INVENTORY') ? ' active' : ''}`}
                    aria-current={isActive('INVENTORY') ? 'page' : undefined}
                    onClick={onInventory}
                >
                    🎒 Inventory {lock}
                </button>

                {isAdmin && (
                    <button
                        type="button"
                        className={`main-sidebar-item${isActive('ADMIN_DASHBOARD') ? ' active' : ''}`}
                        aria-current={isActive('ADMIN_DASHBOARD') ? 'page' : undefined}
                        onClick={onAdmin}
                    >
                        🛠 Admin
                    </button>
                )}
            </div>

            {isGuest ? (
                <div className="main-sidebar-guest-banner">
                    <span className="eyebrow-label">Guest mode</span>
                    <p>Progress isn't saved. Register to unlock everything.</p>
                    <button type="button" className="main-sidebar-guest-register" onClick={onGuestRegister}>Register</button>
                </div>
            ) : (
                <button type="button" className="main-sidebar-armor" onClick={onInventory}>
                    <span className="eyebrow-label">Equipped armor</span>
                    {equippedArmor ? (
                        <>
                            <span className="main-sidebar-armor-icon" aria-hidden="true">{equippedArmor.icon || '🛡️'}</span>
                            <span className="main-sidebar-armor-name">{equippedArmor.name}</span>
                            <span className="main-sidebar-armor-stat">+{equippedArmor.armor_points} armor</span>
                        </>
                    ) : (
                        <span className="main-sidebar-armor-empty">No item equipped</span>
                    )}
                </button>
            )}

            <button type="button" className="main-sidebar-profile" onClick={onProfile}>
                <span className="main-sidebar-profile-name">{displayName || userEmail || 'Player'}</span>
                <span className="main-sidebar-profile-role">{userRole === 'teacher' ? 'Teacher' : 'Student'}</span>
                <span className="main-sidebar-profile-gear" aria-hidden="true">⚙️</span>
            </button>
        </nav>
    );
}

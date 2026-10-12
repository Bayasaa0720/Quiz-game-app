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
        <nav className="main-sidebar" aria-label="Үндсэн навигаци">
            <button type="button" className="main-sidebar-logo" onClick={onHome}>
                🗼 Tower Climb
            </button>

            <div className="main-sidebar-items">
                <span className="main-sidebar-group-label">Тоглох</span>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive(...HOME_NAV_VIEWS) ? ' active' : ''}`}
                    aria-current={isActive(...HOME_NAV_VIEWS) ? 'page' : undefined}
                    onClick={onHome}
                >
                    🏠 Нүүр
                </button>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('LEADERBOARD') ? ' active' : ''}`}
                    aria-current={isActive('LEADERBOARD') ? 'page' : undefined}
                    onClick={onLeaderboard}
                >
                    🏆 Тэргүүлэгчид {lock}
                </button>

                <span className="main-sidebar-group-label">Нийгэм</span>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('FRIENDS') ? ' active' : ''}`}
                    aria-current={isActive('FRIENDS') ? 'page' : undefined}
                    onClick={onFriends}
                >
                    👥 Найзууд ба Duel {lock}
                </button>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('LEARNING') ? ' active' : ''}`}
                    aria-current={isActive('LEARNING') ? 'page' : undefined}
                    onClick={onLearning}
                >
                    🎓 Ангиуд {lock}
                </button>

                <span className="main-sidebar-group-label">Үүсгэх</span>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('MY_TOWERS', 'MANAGE_CONTENT', 'CREATE_QUESTION', 'MANAGE_QUESTIONS', 'BULK_IMPORT') ? ' active' : ''}`}
                    aria-current={isActive('MY_TOWERS', 'MANAGE_CONTENT', 'CREATE_QUESTION', 'MANAGE_QUESTIONS', 'BULK_IMPORT') ? 'page' : undefined}
                    onClick={onMyTowers}
                >
                    🗼 Миний цамхагууд {lock}
                </button>

                <span className="main-sidebar-group-label">Худалдаа</span>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('SHOP') ? ' active' : ''}`}
                    aria-current={isActive('SHOP') ? 'page' : undefined}
                    onClick={onShop}
                >
                    🛒 Дэлгүүр {lock}
                </button>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('INVENTORY') ? ' active' : ''}`}
                    aria-current={isActive('INVENTORY') ? 'page' : undefined}
                    onClick={onInventory}
                >
                    🎒 Инвентар {lock}
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
                    <span className="eyebrow-label">Зочин горим</span>
                    <p>Явц хадгалагдахгүй. Бүртгүүлээд бүх боломжийг нээгээрэй.</p>
                    <button type="button" className="main-sidebar-guest-register" onClick={onGuestRegister}>Бүртгүүлэх</button>
                </div>
            ) : (
                <button type="button" className="main-sidebar-armor" onClick={onInventory}>
                    <span className="eyebrow-label">Идэвхтэй армор</span>
                    {equippedArmor ? (
                        <>
                            <span className="main-sidebar-armor-icon" aria-hidden="true">{equippedArmor.icon || '🛡️'}</span>
                            <span className="main-sidebar-armor-name">{equippedArmor.name}</span>
                            <span className="main-sidebar-armor-stat">+{equippedArmor.armor_points} армор</span>
                        </>
                    ) : (
                        <span className="main-sidebar-armor-empty">Идэвхжүүлсэн эдлэл алга</span>
                    )}
                </button>
            )}

            <button type="button" className="main-sidebar-profile" onClick={onProfile}>
                <span className="main-sidebar-profile-name">{displayName || userEmail || 'Тоглогч'}</span>
                <span className="main-sidebar-profile-role">{userRole === 'teacher' ? 'Багш' : 'Сурагч'}</span>
                <span className="main-sidebar-profile-gear" aria-hidden="true">⚙️</span>
            </button>
        </nav>
    );
}

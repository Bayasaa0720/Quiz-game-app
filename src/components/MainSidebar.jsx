import './MainSidebar.css';

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
    onManageContent,
    onShop,
    onInventory,
    onAdmin,
    onProfile,
    onGuestRegister,
}) {
    const HOME_VIEWS = new Set(['TOWER_SELECT', 'TOWER_VIEW', 'BATTLE', 'DUEL']);
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
                <button
                    type="button"
                    className={`main-sidebar-item${isActive(...HOME_VIEWS) ? ' active' : ''}`}
                    onClick={onHome}
                >
                    🏠 Нүүр
                </button>
                <button
                    type="button"
                    className={`main-sidebar-item${isActive('LEADERBOARD') ? ' active' : ''}`}
                    onClick={onLeaderboard}
                >
                    🏆 Тэргүүлэгчид {lock}
                </button>

                <button
                    type="button"
                    className={`main-sidebar-item${isActive('FRIENDS') ? ' active' : ''}`}
                    onClick={onFriends}
                >
                    👥 Найзууд ба Duel {lock}
                </button>

                <button
                    type="button"
                    className={`main-sidebar-item${isActive('LEARNING') ? ' active' : ''}`}
                    onClick={onLearning}
                >
                    🎓 Сургалт {lock}
                </button>
                <button
                    type="button"
                    className={`main-sidebar-item${isActive('MANAGE_CONTENT', 'CREATE_QUESTION', 'MANAGE_QUESTIONS', 'BULK_IMPORT') ? ' active' : ''}`}
                    onClick={onManageContent}
                >
                    ➕ Цамхаг үүсгэх {lock}
                </button>

                <span className="main-sidebar-group-label">Дэлгүүр</span>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('SHOP') ? ' active' : ''}`}
                    onClick={onShop}
                >
                    🛒 Дэлгүүр {lock}
                </button>
                <button
                    type="button"
                    className={`main-sidebar-item main-sidebar-subitem${isActive('INVENTORY') ? ' active' : ''}`}
                    onClick={onInventory}
                >
                    🎒 Инвентар {lock}
                </button>

                {isAdmin && (
                    <button
                        type="button"
                        className={`main-sidebar-item${isActive('ADMIN_DASHBOARD') ? ' active' : ''}`}
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

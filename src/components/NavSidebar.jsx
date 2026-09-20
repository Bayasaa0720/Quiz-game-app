import './NavSidebar.css';

// Идэвхтэй section-оос хамааран өөрчлөгддөг sub-navigation (зөвхөн desktop,
// mobile дээр CSS-ээр нуугдана). items: [{ label, view, onClick }].
export default function NavSidebar({ items, activeView }) {
    if (!items || items.length === 0) return null;

    return (
        <nav className="nav-sidebar" aria-label="Дэд навигаци">
            {items.map(item => (
                <button
                    key={item.label}
                    type="button"
                    className={`nav-sidebar-item${item.view === activeView ? ' active' : ''}`}
                    onClick={item.onClick}
                >
                    {item.label}
                </button>
            ))}
        </nav>
    );
}

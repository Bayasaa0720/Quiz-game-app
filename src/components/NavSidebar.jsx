import './NavSidebar.css';

// Идэвхтэй section-оос хамааран өөрчлөгддөг sub-navigation (зөвхөн desktop,
// mobile дээр CSS-ээр нуугдана). items: [{ label, view, onClick }].
// extra: section-д зориулсан нэмэлт агуулга (ж: цамхгийн section дээрх
// "одоогийн армор" тойм), nav item-үүдийн доор харагдана.
export default function NavSidebar({ items, activeView, extra }) {
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
            {extra}
        </nav>
    );
}

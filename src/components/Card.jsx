import './Card.css';

export default function Card({ className = '', children, onClick, ...rest }) {
    const interactive = typeof onClick === 'function';

    const handleKeyDown = (e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(e);
        }
    };

    return (
        <div
            className={['card', className].filter(Boolean).join(' ')}
            onClick={onClick}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            onKeyDown={interactive ? handleKeyDown : undefined}
            {...rest}
        >
            {children}
        </div>
    );
}

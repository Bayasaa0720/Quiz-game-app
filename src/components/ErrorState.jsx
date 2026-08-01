import Button from './Button.jsx';
import './ErrorState.css';

export default function ErrorState({ message, onRetry }) {
    return (
        <div className="error-state">
            <p>{message}</p>
            {onRetry && <Button variant="ghost" onClick={onRetry}>Дахин оролдох</Button>}
        </div>
    );
}

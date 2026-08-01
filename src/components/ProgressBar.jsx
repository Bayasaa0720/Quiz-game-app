import './ProgressBar.css';

export default function ProgressBar({ value, max = 100, variant = 'accent', label }) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

    return (
        <div className="progress-bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
            {label && <div className="progress-bar-label">{label}</div>}
            <div className="progress-bar-track">
                <div className={`progress-bar-fill progress-bar-${variant}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

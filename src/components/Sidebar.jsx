import ProgressBar from './ProgressBar.jsx';
import PlayerCharacter from './PlayerCharacter.jsx';
import EnemyCharacter from './EnemyCharacter.jsx';
import './Sidebar.css';

export function PlayerSidebar({ name, hp, maxHp, note, anim, tick, size }) {
    return (
        <aside className="app-sidebar">
            <div className="sidebar-panel">
                <div className="sidebar-character-frame">
                    <PlayerCharacter animKey={tick ?? 0} anim={anim ?? 'idle'} size={size} />
                </div>
                <p className="sidebar-name">{name || 'Тоглогч'}</p>
                <ProgressBar
                    value={hp ?? 100}
                    max={maxHp ?? 100}
                    variant="success"
                    label={<span>HP {hp ?? '-'} / {maxHp ?? '-'}</span>}
                />
                {note && <p className="sidebar-note">{note}</p>}
            </div>
        </aside>
    );
}

export function EnemySidebar({ name, hp, maxHp, note, anim, tick, variant, size }) {
    return (
        <aside className="app-sidebar right">
            <div className="sidebar-panel">
                <div className="sidebar-character-frame">
                    <EnemyCharacter animKey={tick ?? 0} anim={anim ?? 'idle'} variant={variant ?? 'orc'} size={size} />
                </div>
                <p className="sidebar-name">{name || 'Дайсан'}</p>
                <ProgressBar
                    value={hp ?? 100}
                    max={maxHp ?? 100}
                    variant="danger"
                    label={<span>HP {hp ?? '-'} / {maxHp ?? '-'}</span>}
                />
                {note && <p className="sidebar-note">{note}</p>}
            </div>
        </aside>
    );
}

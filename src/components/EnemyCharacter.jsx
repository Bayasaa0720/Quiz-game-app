import SpriteCharacter from './SpriteCharacter.jsx';
import orcIdle from '../assets/sprites/orc/idle.png';
import orcAttack from '../assets/sprites/orc/attack.png';
import orcHurt from '../assets/sprites/orc/hurt.png';
import orcDeath from '../assets/sprites/orc/death.png';
import demonIdle from '../assets/sprites/demon/idle.png';
import demonAttack from '../assets/sprites/demon/attack.png';
import demonHurt from '../assets/sprites/demon/hurt.png';
import demonDeath from '../assets/sprites/demon/death.png';
import bloodIdle from '../assets/sprites/bloodmonster/idle.png';
import bloodAttack from '../assets/sprites/bloodmonster/attack.png';
import bloodHurt from '../assets/sprites/bloodmonster/hurt.png';
import bloodDeath from '../assets/sprites/bloodmonster/death.png';

const VARIANTS = {
    orc: {
        idle: { src: orcIdle, frames: 6, fps: 8, loop: true },
        attack: { src: orcAttack, frames: 6, fps: 14, loop: false },
        hurt: { src: orcHurt, frames: 4, fps: 12, loop: false },
        victory: { src: orcIdle, frames: 6, fps: 8, loop: true },
        defeat: { src: orcDeath, frames: 4, fps: 8, loop: false },
    },
    demon: {
        idle: { src: demonIdle, frames: 6, fps: 8, loop: true },
        attack: { src: demonAttack, frames: 6, fps: 14, loop: false },
        hurt: { src: demonHurt, frames: 4, fps: 12, loop: false },
        victory: { src: demonIdle, frames: 6, fps: 8, loop: true },
        defeat: { src: demonDeath, frames: 4, fps: 8, loop: false },
    },
    blood: {
        idle: { src: bloodIdle, frames: 6, fps: 8, loop: true },
        attack: { src: bloodAttack, frames: 6, fps: 14, loop: false },
        hurt: { src: bloodHurt, frames: 4, fps: 12, loop: false },
        victory: { src: bloodIdle, frames: 6, fps: 8, loop: true },
        defeat: { src: bloodDeath, frames: 4, fps: 8, loop: false },
    },
};

export default function EnemyCharacter({ anim = 'idle', animKey, size = 72, variant = 'orc' }) {
    const sheets = VARIANTS[variant] ?? VARIANTS.orc;
    const sheet = sheets[anim] ?? sheets.idle;
    return (
        <SpriteCharacter
            animKey={`${variant}-${anim}-${animKey}`}
            src={sheet.src}
            frames={sheet.frames}
            fps={sheet.fps}
            loop={sheet.loop}
            size={size}
            flip
        />
    );
}

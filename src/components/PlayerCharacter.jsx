import SpriteCharacter from './SpriteCharacter.jsx';
import idleSrc from '../assets/sprites/soldier/idle.png';
import attackSrc from '../assets/sprites/soldier/attack.png';
import hurtSrc from '../assets/sprites/soldier/hurt.png';
import deathSrc from '../assets/sprites/soldier/death.png';
import walkSrc from '../assets/sprites/soldier/walk.png';

const SHEETS = {
    idle: { src: idleSrc, frames: 6, fps: 8, loop: true },
    walk: { src: walkSrc, frames: 8, fps: 10, loop: true },
    attack: { src: attackSrc, frames: 6, fps: 14, loop: false },
    hurt: { src: hurtSrc, frames: 4, fps: 12, loop: false },
    victory: { src: idleSrc, frames: 6, fps: 8, loop: true },
    defeat: { src: deathSrc, frames: 4, fps: 8, loop: false },
};

export default function PlayerCharacter({ anim = 'idle', animKey, size = 72 }) {
    const sheet = SHEETS[anim] ?? SHEETS.idle;
    return (
        <SpriteCharacter
            animKey={`${anim}-${animKey}`}
            src={sheet.src}
            frames={sheet.frames}
            fps={sheet.fps}
            loop={sheet.loop}
            size={size}
        />
    );
}

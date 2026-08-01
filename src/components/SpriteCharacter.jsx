import './SpriteCharacter.css';

const NATIVE_FRAME = 100; // px, source sheet's per-frame tile size
const ZOOM = 2.8; // the drawn character only fills a small part of each tile; zoom in to fill the box

export default function SpriteCharacter({ src, frames, size = 96, fps = 10, loop = true, animKey, flip = false }) {
    const duration = frames / fps;
    const frameSize = NATIVE_FRAME * ZOOM;
    // Looping: run one extra step past the last frame so the loop restart is seamless.
    // Single-play: stop exactly on the last real frame instead of running past the sheet's edge.
    const steps = loop ? frames : Math.max(frames - 1, 1);
    const endOffset = loop ? frames * frameSize : (frames - 1) * frameSize;
    return (
        <div className="sprite-viewport" style={{ '--size': `${size}px` }}>
            <div
                key={animKey}
                className={`sprite-character${flip ? ' sprite-flip' : ''}`}
                style={{
                    '--frames': frames,
                    '--steps': steps,
                    '--frame-size': `${frameSize}px`,
                    '--end-offset': `-${endOffset}px`,
                    '--duration': `${duration}s`,
                    '--iteration': loop ? 'infinite' : '1',
                    backgroundImage: `url(${src})`,
                }}
                role="img"
            />
        </div>
    );
}

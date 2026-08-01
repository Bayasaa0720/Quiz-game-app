import { useState, useEffect } from 'react';

export function useViewportWidth() {
    const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));

    useEffect(() => {
        const onResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return width;
}

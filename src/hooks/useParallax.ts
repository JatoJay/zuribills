import { useState, useEffect } from 'react';

/**
 * A hook to get a parallax offset based on window scroll.
 * @param speed - The speed factor. 0.5 means half the scroll speed. Negative values move up.
 * @returns An object containing the transform style.
 */
export const useParallax = (speed: number = 0.5) => {
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setOffset(window.scrollY * speed);
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [speed]);

    return { transform: `translateY(${offset}px)` };
};

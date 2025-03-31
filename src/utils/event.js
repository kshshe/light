export const addEvent = (events, callback) => {
    events.forEach(event => {
        window.addEventListener(event, (e) => {
            try {
                e.preventDefault();
            } catch (error) {
                console.error(error);
            }

            const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
            const y = window.innerHeight - (e.clientY ?? e.touches?.[0]?.clientY ?? 0);

            callback(x, y, e);
        }, { passive: false });
    });
};

export const addKeydownEvent = (keys, callback) => {
    window.addEventListener('keydown', (e) => {
        if (keys.includes(e.key)) {
            callback(e);
        }
    });
};


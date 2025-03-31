import { PRETTY_COLORS } from './constants.js';

export const initializeEvents = (lightSource, sources, state, MAX_SOURCES) => {
  const addEvent = (events, callback) => {
    events.forEach(event => {
      window.addEventListener(event, (e) => {
        try {
          e.preventDefault();
        } catch (error) {
          console.error(error);
        }

        // Get the raw client coordinates
        const rawX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const rawY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
        
        // Scale coordinates by 2 to match the canvas resolution
        const x = rawX * 2;
        const y = window.innerHeight * 2 - (rawY * 2);

        callback(x, y, e);
      });
    });
  };

  let wasTouchClickStarted = false;
  let touchClickTimeout = null;
  const touchClickPosition = {
    x: 0,
    y: 0,
  };

  window.addEventListener('wheel', (e) => {
    const delta = e.deltaY;

    if (delta > 0) {
      lightSource.intensity += 1;
    } else {
      lightSource.intensity -= 1;
    }

    lightSource.intensity = Math.max(0.1, lightSource.intensity);
    lightSource.intensity = Math.min(200, lightSource.intensity);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'r') {
      state.isMovingSourceManually = false;
    }

    if (e.key === 'c') {
      const randomIndex = Math.floor(Math.random() * PRETTY_COLORS.length);
      const randomColor = PRETTY_COLORS[randomIndex];
      lightSource.color.r = randomColor.r;
      lightSource.color.g = randomColor.g;
      lightSource.color.b = randomColor.b;
      const sum = lightSource.color.r + lightSource.color.g + lightSource.color.b;
      const increase = 3 / sum;
      lightSource.color.r *= increase;
      lightSource.color.g *= increase;
      lightSource.color.b *= increase;
    }
  });
  
  addEvent(['click'], (x, y) => {
    wasTouchClickStarted = false;
    if (sources.length >= MAX_SOURCES) {
      return;
    }

    const newLightSource = {
      isVisible: true,
      position: {
        x,
        y,
      },
      intensity: lightSource.intensity,
      color: {
        ...lightSource.color,
      },
    };

    sources.push(newLightSource);
  });

  addEvent(['mousemove', 'touchmove'], (x, y) => {
    state.isMovingSourceManually = true;
    lightSource.isVisible = true;
    lightSource.targetPosition = {
      x,
      y,
    };
  });

  addEvent(['touchstart'], (x, y) => {
    if (touchClickTimeout) {
      clearTimeout(touchClickTimeout);
    }

    wasTouchClickStarted = true;
    touchClickPosition.x = x;
    touchClickPosition.y = y;
    touchClickTimeout = setTimeout(() => {
      wasTouchClickStarted = false;
    }, 100);
  });

  addEvent(['mouseleave', 'mouseout', 'touchend', 'touchcancel'], () => {
    state.isMovingSourceManually = false;
    if (wasTouchClickStarted) {
      if (sources.length >= MAX_SOURCES) {
        return;
      }
      sources.push({
        isVisible: true,
        position: { x: touchClickPosition.x, y: touchClickPosition.y },
        intensity: lightSource.intensity,
        color: {
          ...lightSource.color,
        },
      });
    }
  });

  let reloadTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(reloadTimeout);
    reloadTimeout = setTimeout(() => {
      window.location.reload();
    }, 100);
  });

  // Initialize animation intervals
  setInterval(() => {
    if (state.isMovingSourceManually) {
      return;
    }

    const leftX = window.innerWidth * 2 / 2;
    const topY = window.innerHeight * 2 / 2;
    
    if (lightSource.color.r !== 1) {
      const diff = 1 - lightSource.color.r;
      lightSource.color.r += diff / 50;
    }

    if (lightSource.color.g !== 1) {
      const diff = 1 - lightSource.color.g;
      lightSource.color.g += diff / 50;
    }

    if (lightSource.color.b !== 1) {
      const diff = 1 - lightSource.color.b;
      lightSource.color.b += diff / 50;
    }

    const targetX = leftX + 150 * 2 * Math.cos(Date.now() / 2000);
    const targetY = topY + 150 * 2 * Math.sin(Date.now() / 2000);

    if (!lightSource.targetPosition) {
      lightSource.position = {
        x: targetX,
        y: targetY,
      };
      lightSource.targetPosition = {
        x: targetX,
        y: targetY,
      };
    }
    
    lightSource.targetPosition.x = targetX;
    lightSource.targetPosition.y = targetY;
    lightSource.isVisible = true;
    if (lightSource.intensity !== 40) {
      const diff = 40 - lightSource.intensity;
      lightSource.intensity += diff / 50;
    }
  }, 10);

  setInterval(() => {
    if (!lightSource.targetPosition) {
      return;
    }

    const xDiff = lightSource.targetPosition.x - lightSource.position.x;
    const yDiff = lightSource.targetPosition.y - lightSource.position.y;

    lightSource.position.x += xDiff / 10;
    lightSource.position.y += yDiff / 10;
  }, 10);
}; 
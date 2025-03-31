import { PRETTY_COLORS } from './constants.js';
import { addEvent, addKeydownEvent } from './utils/event.js';

export const initializeEvents = (lightSource, sources, state, MAX_SOURCES, obstacles) => {
  let wasTouchClickStarted = false;
  let touchClickTimeout = null;
  const touchClickPosition = {
    x: 0,
    y: 0,
  };
  let isPinching = false;
  let previousPinchDistance = 0;

  window.addEventListener('wheel', (e) => {
    const delta = e.deltaY;

    if (delta > 0) {
      lightSource.intensity += 1;
    } else {
      lightSource.intensity -= 1;
    }

    lightSource.intensity = Math.max(0.1, lightSource.intensity);
    lightSource.intensity = Math.min(100, lightSource.intensity);
  });

  const RANDOM_SOURCES_COUNT = 3;
  const randomSources = [];
  addKeydownEvent([' '], () => {
    if (sources.length >= MAX_SOURCES) {
      return;
    }
    
    const availableSources = MAX_SOURCES - sources.length;
    const randomSourcesCount = Math.min(availableSources, RANDOM_SOURCES_COUNT);
    if (randomSources.length === 0) {
      for (let i = 0; i < randomSourcesCount; i++) {
        const newSource = {
          isVisible: true,
          position: {
            ...lightSource.position,
          },
          targetPosition: {
            ...lightSource.position,
          },
          intensity: 0,
          color: {
            ...lightSource.color,
          },
        }
        randomSources.push(newSource);
        sources.push(newSource);
      }
    }

    randomSources.forEach(source => {
      source.targetPosition.x = Math.random() * window.innerWidth;
      source.targetPosition.y = Math.random() * window.innerHeight;
      source.intensity = Math.round(Math.random() * 70 + 10);
      source.isVisible = true;

      source.color.r = Math.random();
      source.color.g = Math.random();
      source.color.b = Math.random();
    });
  });

  addKeydownEvent(['h', 'р'], () => {
    obstacles.forEach(obstacle => {
      obstacle.isVisible = !obstacle.isVisible;
    });
  });

  addKeydownEvent(['r', 'к'], () => {
    state.isMovingSourceManually = false;
  });

  addKeydownEvent(['c', 'с'], () => {
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
  });
  
  addEvent(['click'], (x, y, e) => {
    if (isPinching) return;
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
      targetPosition: {
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

  addEvent(['mousemove', 'touchmove'], (x, y, e) => {
    state.isMovingSourceManually = true;
    lightSource.isVisible = true;
    lightSource.targetPosition = {
      x,
      y,
    };
  });

  addEvent(['touchstart'], (x, y, e) => {
    if (e.touches?.length > 1) {
      wasTouchClickStarted = false;
      if (touchClickTimeout) clearTimeout(touchClickTimeout);
      return;
    }

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
    if (isPinching) return;

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

  // --- Pinch Gesture Handling ---
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      isPinching = true;
      state.isMovingSourceManually = false;
      previousPinchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (!isPinching || e.touches.length !== 2) return;

    e.preventDefault();

    const currentPinchDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );

    if (previousPinchDistance > 0) {
      const scale = currentPinchDistance / previousPinchDistance;
      lightSource.intensity *= scale;
      lightSource.intensity = Math.max(0.1, Math.min(100, lightSource.intensity));
    }

    previousPinchDistance = currentPinchDistance;
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    if (isPinching && e.touches.length < 2) {
      isPinching = false;
      previousPinchDistance = 0;
      if (e.touches.length === 1) {
         state.isMovingSourceManually = true;
         lightSource.isVisible = true;
         lightSource.targetPosition = {
           x: e.touches[0].clientX,
           y: window.innerHeight - e.touches[0].clientY,
         };
      }
    }
  });
  // --- End Pinch Gesture Handling ---

  // Initialize animation intervals
  setInterval(() => {
    if (state.isMovingSourceManually) {
      return;
    }

    const leftX = window.innerWidth / 2;
    const topY = window.innerHeight / 2;
    
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

    const targetX = leftX + 150 * Math.cos(Date.now() / 4000);
    const targetY = topY + 150 * Math.sin(Date.now() / 4000);

    if (!lightSource.targetPosition) {
      lightSource.position.x = targetX;
      lightSource.position.y = targetY;
      lightSource.targetPosition = {
        x: targetX,
        y: targetY,
      };
    }
    
    lightSource.targetPosition.x = targetX;
    lightSource.targetPosition.y = targetY;
    lightSource.isVisible = true;
    if (lightSource.intensity !== 20) {
      const diff = 20 - lightSource.intensity;
      lightSource.intensity += diff / 50;
    }
  }, 10);

  setInterval(() => {
    for (const source of sources) {
      if (!source.targetPosition) {
        return;
      }

      const xDiff = source.targetPosition.x - source.position.x;
      const yDiff = source.targetPosition.y - source.position.y;

      source.position.x += xDiff / 10;
      source.position.y += yDiff / 10;
    }
  }, 10);
}; 
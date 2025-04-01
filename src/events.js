import { PRETTY_COLORS } from './constants.js';
import { addEvent, addKeydownEvent } from './utils/event.js';
import { getRandomDirection } from './utils/getRandomDirection.js';

const RANDOM_SOURCES_COUNT = 3;

const isSmallScreen = window.innerWidth < 768;
const intensityVariation = isSmallScreen ? 15 : 25;
const getRandomIntensity = () => {
  return Math.round(Math.random() * intensityVariation + 8);
}

const getRandomColor = () => 0.5 + Math.random() * 0.5;

const intervals = [];
const addOrMoveRandomSources = (sources, MAX_SOURCES, randomSources, lightSource) => {
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

  for (const interval of intervals) {
    clearInterval(interval);
  }

  randomSources.forEach(source => {
    let targetIntensity = getRandomIntensity();
    const direction = getRandomDirection();
    source.targetPosition.x = Math.random() * window.innerWidth;
    source.targetPosition.y = Math.random() * window.innerHeight;
    source.intensity = targetIntensity;
    source.isVisible = true;

    let targetR = getRandomColor();
    let targetG = getRandomColor();
    let targetB = getRandomColor();

    source.color.r = targetR;
    source.color.g = targetG;
    source.color.b = targetB;

    const speed = 1;

    const interval = setInterval(() => {
      if (source.intensity < targetIntensity) {
        source.intensity += 0.01;
      }

      if (source.color.r !== targetR) {
        source.color.r += (targetR - source.color.r) / 100;
      }

      if (source.color.g !== targetG) {
        source.color.g += (targetG - source.color.g) / 100;
      }

      if (source.color.b !== targetB) {
        source.color.b += (targetB - source.color.b) / 100;
      }

      if (Math.random() > 0.995) {
        const newIntensity = getRandomIntensity();
        console.log(`changing intensity from ${targetIntensity} to ${newIntensity}`);
        targetIntensity = newIntensity;
      }

      if (Math.random() > 0.995) {
        const newR = getRandomColor();
        const newG = getRandomColor();
        const newB = getRandomColor();
        console.log(`changing color from rgb(${source.color.r.toFixed(2)}, ${source.color.g.toFixed(2)}, ${source.color.b.toFixed(2)}) to rgb(${newR.toFixed(2)}, ${newG.toFixed(2)}, ${newB.toFixed(2)})`);
        targetR = newR;
        targetG = newG;
        targetB = newB;
      }

      let nextX = source.targetPosition.x + direction.x * speed;
      let nextY = source.targetPosition.y + direction.y * speed;

      const revertX = () => {
        direction.x = -direction.x;
        nextX = source.targetPosition.x + direction.x * 1;
      }

      const revertY = () => {
        direction.y = -direction.y;
        nextY = source.targetPosition.y + direction.y * 1;
      }

      if (nextX < 0 || nextX > window.innerWidth) {
        revertX();
      }
      if (nextY < 0 || nextY > window.innerHeight) {
        revertY();
      }

      source.targetPosition = {
        x: nextX,
        y: nextY,
      }

      const shouldChangeDirection = Math.random() > 0.9999;
      if (shouldChangeDirection) {
        console.log(`changing direction from ${direction.x} ${direction.y} to ${newDirection.x} ${newDirection.y}`);
        direction = newDirection;
      }
    }, 16)

    intervals.push(interval);
  });
};

export const initializeEvents = (lightSource, sources, state, MAX_SOURCES, obstacles, fixCanvasSize = () => {}) => {
  let wasTouchClickStarted = false;
  let touchClickTimeout = null;
  let longPressTimeout = null;
  let isLongPressing = false;
  const touchClickPosition = {
    x: 0,
    y: 0,
  };
  const touchStartPosition = {
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

    lightSource.intensity = Math.max(5, lightSource.intensity);
    lightSource.intensity = Math.min(100, lightSource.intensity);
  });

  const randomSources = [];
  addKeydownEvent([' '], () => {
    addOrMoveRandomSources(sources, MAX_SOURCES, randomSources, lightSource);
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
    if (longPressTimeout) {
      const deltaX = x - touchStartPosition.x;
      const deltaY = y - touchStartPosition.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > 20) {
        clearTimeout(longPressTimeout);
        isLongPressing = false;
      }

    }
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
      if (longPressTimeout) clearTimeout(longPressTimeout);
      isLongPressing = false;
      return;
    }

    if (touchClickTimeout) {
      clearTimeout(touchClickTimeout);
    }

    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
    }

    isLongPressing = false;

    wasTouchClickStarted = true;
    touchClickPosition.x = x;
    touchClickPosition.y = y;
    touchStartPosition.x = x;
    touchStartPosition.y = y;

    touchClickTimeout = setTimeout(() => {
      wasTouchClickStarted = false;
    }, 200);

    longPressTimeout = setTimeout(() => {
      isLongPressing = true;
      wasTouchClickStarted = false;
      if (touchClickTimeout) clearTimeout(touchClickTimeout);

      addOrMoveRandomSources(sources, MAX_SOURCES, randomSources, lightSource);
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }, 500);
  });

  addEvent(['mouseleave', 'mouseout', 'touchend', 'touchcancel'], () => {
    if (isPinching) return;

    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
    }

    state.isMovingSourceManually = false;

    if (wasTouchClickStarted && !isLongPressing) {
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

  addKeydownEvent(['f', 'а'], () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
      setTimeout(fixCanvasSize, 100);
    }
  });

  let fixCanvasTimeout;
  let reloadTimeout;
  let prevWidth = 0;
  let prevHeight = 0;
  window.addEventListener('resize', () => {
    if (prevWidth > window.innerWidth || prevHeight > window.innerHeight) {
      clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }

    clearTimeout(fixCanvasTimeout);
    fixCanvasTimeout = setTimeout(() => {
      fixCanvasSize();
      prevWidth = window.innerWidth;
      prevHeight = window.innerHeight;
    }, 100);
  });

  // --- Pinch and Two Finger Tap Handling ---
  let twoFingerTapStartTime = 0;
  let isTwoFingerTap = false;
  let twoFingerStartPositions = null;

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      wasTouchClickStarted = false;
      twoFingerTapStartTime = Date.now();
      isTwoFingerTap = true;
      twoFingerStartPositions = [
        { x: e.touches[0].clientX, y: e.touches[0].clientY },
        { x: e.touches[1].clientX, y: e.touches[1].clientY }
      ];

      // Initialize pinch values (will be used if the gesture becomes a pinch)
      previousPinchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2) return;

    // Check if the move is significant enough to be considered a pinch
    if (twoFingerStartPositions && !isPinching) {
      const moveThreshold = 10;
      const dx1 = Math.abs(e.touches[0].clientX - twoFingerStartPositions[0].x);
      const dy1 = Math.abs(e.touches[0].clientY - twoFingerStartPositions[0].y);
      const dx2 = Math.abs(e.touches[1].clientX - twoFingerStartPositions[1].x);
      const dy2 = Math.abs(e.touches[1].clientY - twoFingerStartPositions[1].y);

      if (dx1 > moveThreshold || dy1 > moveThreshold || dx2 > moveThreshold || dy2 > moveThreshold) {
        // This is a significant movement, so not a tap
        isTwoFingerTap = false;

        // If the distance between fingers is changing, consider it a pinch
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );

        const distanceDelta = Math.abs(currentDistance - previousPinchDistance);
        if (distanceDelta > 5) {
          isPinching = true;
          state.isMovingSourceManually = false;
        }
      }
    }

    // Handle pinching
    if (isPinching) {
      e.preventDefault();

      const currentPinchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      if (previousPinchDistance > 0) {
        const scale = currentPinchDistance / previousPinchDistance;
        lightSource.intensity *= scale;
        lightSource.intensity = Math.max(5, Math.min(100, lightSource.intensity));
      }

      previousPinchDistance = currentPinchDistance;
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    // Handle two finger tap if it wasn't a pinch
    if (isTwoFingerTap && !isPinching && Date.now() - twoFingerTapStartTime < 300) {
      // Change color (same logic as the 'c' key press)
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

      // Provide haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }

    // Handle pinch ending
    if (isPinching && e.touches.length < 2) {
      isPinching = false;
      if (e.touches.length === 1) {
        state.isMovingSourceManually = true;
        lightSource.isVisible = true;
        lightSource.targetPosition = {
          x: e.touches[0].clientX,
          y: window.innerHeight - e.touches[0].clientY,
        };
      }
    }

    // Reset state if all fingers are lifted
    if (e.touches.length === 0) {
      isTwoFingerTap = false;
      isPinching = false;
      twoFingerStartPositions = null;
      previousPinchDistance = 0;
    }
  });
  // --- End of Pinch and Two Finger Tap Handling ---

  // Initialize animation intervals
  setInterval(() => {
    if (state.isMovingSourceManually) {
      return;
    }

    const leftX = window.innerWidth / 2;
    const topY = window.innerHeight / 2;

    if (lightSource.color.r !== 1) {
      const diff = 1 - lightSource.color.r;
      lightSource.color.r += diff / 200;
    }

    if (lightSource.color.g !== 1) {
      const diff = 1 - lightSource.color.g;
      lightSource.color.g += diff / 200;
    }

    if (lightSource.color.b !== 1) {
      const diff = 1 - lightSource.color.b;
      lightSource.color.b += diff / 200;
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
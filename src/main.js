import { inject } from "@vercel/analytics"

inject()

const MAX_SOURCES = 10;
const MAX_OBSTACLES = 10;

const PRETTY_COLORS = [
  { r: 0.95, g: 0.80, b: 0.81 }, // Pastel Pink
  { r: 0.80, g: 0.89, b: 0.95 }, // Pastel Blue
  { r: 0.87, g: 0.95, b: 0.80 }, // Pastel Green
  { r: 0.95, g: 0.95, b: 0.80 }, // Pastel Yellow
  { r: 0.95, g: 0.87, b: 0.73 }, // Pastel Peach
  { r: 0.89, g: 0.80, b: 0.95 }, // Pastel Lavender
  { r: 0.80, g: 0.95, b: 0.91 }, // Pastel Mint
  { r: 0.95, g: 0.85, b: 0.95 }, // Pastel Lilac
  { r: 0.89, g: 0.82, b: 0.75 }, // Pastel Taupe
  { r: 0.84, g: 0.95, b: 0.88 },  // Pastel Seafoam

  // Neon colors
  { r: 1.0, g: 0.0, b: 1.0 },   // Neon Pink
  { r: 0.0, g: 1.0, b: 0.0 },   // Neon Green
  { r: 1.0, g: 0.8, b: 0.0 },   // Neon Orange
  { r: 0.0, g: 1.0, b: 1.0 },   // Neon Cyan
  { r: 1.0, g: 0.0, b: 0.0 },   // Neon Red
  { r: 0.5, g: 0.0, b: 1.0 },   // Neon Purple
  { r: 0.8, g: 1.0, b: 0.0 },   // Neon Lime
  { r: 1.0, g: 0.0, b: 0.5 },   // Neon Magenta
  { r: 0.0, g: 0.5, b: 1.0 },   // Neon Blue
  { r: 1.0, g: 1.0, b: 0.0 },   // Neon Yellow

  // Basic colors
  { r: 1.0, g: 0.0, b: 0.0 },   // Red
  { r: 0.0, g: 1.0, b: 0.0 },   // Green
  { r: 0.0, g: 0.0, b: 1.0 },   // Blue
  { r: 1.0, g: 1.0, b: 1.0 },   // White
]

const initEverything = () => {
  const state = {
    isMovingSourceManually: false,
  }

  const GpuConstructor = GPU.GPU ?? GPU;
  if (!GpuConstructor) {
    throw new Error('GPU.js is not loaded properly');
  }

  function ccw(aX, aY, bX, bY, cX, cY) {
    if ((cY - aY) * (bX - aX) > (bY - aY) * (cX - aX)) {
      return 1;
    }

    return 0;
  }

  function intersect(aX, aY, bX, bY, cX, cY, dX, dY) {
    const ACDResult = ccw(aX, aY, cX, cY, dX, dY);
    const BCDResult = ccw(bX, bY, cX, cY, dX, dY);
    const ABCResult = ccw(aX, aY, bX, bY, cX, cY);
    const ABDResult = ccw(aX, aY, bX, bY, dX, dY);

    if (ACDResult !== BCDResult) {
      if (ABCResult !== ABDResult) {
        return 0;
      }
    }
    return 1;
  }

  const gpu = new GpuConstructor();
  const render = gpu.createKernel(function (sources, obstacles) {
    const x = this.thread.x;
    const y = this.thread.y;

    let sumOfIntensitiesR = 0;
    let sumOfIntensitiesG = 0;
    let sumOfIntensitiesB = 0;

    for (let i = 0; i < this.constants.sourcesCount; i++) {
      const startIndex = i * 6;
      const sourceX = sources[startIndex];
      const sourceY = sources[startIndex + 1];
      const sourceIntensity = sources[startIndex + 2];
      const sourceColorR = sources[startIndex + 3];
      const sourceColorG = sources[startIndex + 4];
      const sourceColorB = sources[startIndex + 5];

      if (sourceIntensity > 0) {
        const distance = Math.sqrt((x - sourceX) ** 2 + (y - sourceY) ** 2);
        const intensity = sourceIntensity / distance;

        let opacitiesResult = 1;
        for (let j = 0; j < this.constants.obstaclesCount; j++) {
          const obstacleStartX = obstacles[j * 5];
          const obstacleStartY = obstacles[j * 5 + 1];
          const obstacleEndX = obstacles[j * 5 + 2];
          const obstacleEndY = obstacles[j * 5 + 3];
          const obstacleOpacity = obstacles[j * 5 + 4];

          if (obstacleEndX !== obstacleStartX || obstacleEndY !== obstacleStartY) {
            if (intersect(sourceX, sourceY, x, y, obstacleStartX, obstacleStartY, obstacleEndX, obstacleEndY) === 0) {
              opacitiesResult *= obstacleOpacity;
            }
          }
        }

        sumOfIntensitiesR += intensity * opacitiesResult * sourceColorR;
        sumOfIntensitiesG += intensity * opacitiesResult * sourceColorG;
        sumOfIntensitiesB += intensity * opacitiesResult * sourceColorB;
      }
    }

    this.color(sumOfIntensitiesR, sumOfIntensitiesG, sumOfIntensitiesB);
  }, {
    constants: {
      sourcesCount: MAX_SOURCES,
      obstaclesCount: MAX_OBSTACLES,
    }
  })
    .setOutput([window.innerWidth, window.innerHeight])
    .setGraphical(true)
    .addFunction(ccw, {
      argumentTypes: {
        aX: 'Number',
        aY: 'Number',
        bX: 'Number',
        bY: 'Number',
        cX: 'Number',
        cY: 'Number',
      }, returnType: 'Number'
    })
    .addFunction(intersect, {
      argumentTypes: {
        aX: 'Number',
        aY: 'Number',
        bX: 'Number',
        bY: 'Number',
        cX: 'Number',
        cY: 'Number',
        dX: 'Number',
        dY: 'Number',
      }, returnType: 'Number'
    });

  const canvas = render.canvas;
  document.getElementsByTagName('body')[0].appendChild(canvas);

  const randomInitialColor = PRETTY_COLORS[Math.floor(Math.random() * PRETTY_COLORS.length)];
  const lightSource = {
    isVisible: false,
    position: {
      x: window.innerWidth * Math.random(),
      y: window.innerHeight * Math.random(),
    },
    intensity: 20,
    color: {
      r: randomInitialColor.r / 3,
      g: randomInitialColor.g / 3,
      b: randomInitialColor.b / 3,
    },
  }

  setInterval(() => {
    if (!lightSource.targetPosition) {
      return;
    }

    const xDiff = lightSource.targetPosition.x - lightSource.position.x;
    const yDiff = lightSource.targetPosition.y - lightSource.position.y;

    lightSource.position.x += xDiff / 10;
    lightSource.position.y += yDiff / 10;
  }, 10)

  const sources = [lightSource];

  setInterval(() => {
    if (state.isMovingSourceManually) {
      return;
    }

    const leftX = window.innerWidth / 2;
    const topY = window.innerHeight / 2;

    if (!lightSource.targetPosition) {
      lightSource.targetPosition = {
        ...lightSource.position,
      }
    }
    
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
    
    lightSource.targetPosition.x = leftX + 100 * Math.cos(Date.now() / 1000);
    lightSource.targetPosition.y = topY + 100 * Math.sin(Date.now() / 1000);
    lightSource.isVisible = true;
    if (lightSource.intensity !== 10) {
      const diff = 10 - lightSource.intensity;
      lightSource.intensity += diff / 50;
    }
  }, 10);

  const addEvent = (events, callback) => {
    events.forEach(event => {
      window.addEventListener(event, (e) => {
        const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const y = window.innerHeight - (e.clientY ?? e.touches?.[0]?.clientY ?? 0);

        callback(x, y, e);
      });
    });
  }

  window.addEventListener('wheel', (e) => {
    const delta = e.deltaY;

    if (delta > 0) {
      lightSource.intensity += 1;
    } else {
      lightSource.intensity -= 1;
    }

    lightSource.intensity = Math.max(0.1, lightSource.intensity);
    lightSource.intensity = Math.min(100, lightSource.intensity);
  })

  window.addEventListener('keydown', (e) => {
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

    if (e.key === 'f') {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    }
  })

  let wasTouchClickStarted = false;
  let touchClickTimeout = null
  const touchClickPosition = {
    x: 0,
    y: 0,
  }
  
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
    }

    sources.push(newLightSource);
  })

  addEvent(['mousemove', 'touchmove'], (x, y) => {
    state.isMovingSourceManually = true;
    lightSource.isVisible = true;
    lightSource.targetPosition = {
      x,
      y,
    }
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
  })

  addEvent(['mouseleave', 'mouseout', 'touchend', 'touchcancel'], () => {
    state.isMovingSourceManually = false;
    if (wasTouchClickStarted) {
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

  function flattenSources(sources) {
    const flattenedSources = sources.flatMap(source => [
      source.position.x,
      source.position.y,
      source.intensity,
      source.color.r,
      source.color.g,
      source.color.b,
    ]);

    if (flattenedSources.length < MAX_SOURCES * 6) {
      flattenedSources.push(...Array(MAX_SOURCES * 6 - flattenedSources.length).fill(0));
    }

    return flattenedSources;
  }

  function flattenObstacles(obstacles) {
    const flattenedObstacles = obstacles.flatMap(obstacle => [
      obstacle.startX,
      obstacle.startY,
      obstacle.endX,
      obstacle.endY,
      obstacle.opacity,
    ]);

    if (flattenedObstacles.length < MAX_OBSTACLES * 5) {
      flattenedObstacles.push(...Array(MAX_OBSTACLES * 5 - flattenedObstacles.length).fill(0));
    }

    return flattenedObstacles;
  }

  function getSquare(options) {
    return [
      // Square
      // left side
      {
        startX: options.x,
        startY: window.innerHeight - options.y,
        endX: options.x,
        endY: window.innerHeight - (options.y + options.height),
        opacity: 0.4,
      },
      // right side
      {
        startX: options.x + options.width,
        startY: window.innerHeight - options.y,
        endX: options.x + options.width,
        endY: window.innerHeight - (options.y + options.height),
        opacity: 0.4,
      },
      // bottom side
      {
        startX: options.x,
        startY: window.innerHeight - (options.y + options.height),
        endX: options.x + options.width,
        endY: window.innerHeight - (options.y + options.height),
        opacity: 0.4,
      },
      // top side
      {
        startX: options.x,
        startY: window.innerHeight - options.y,
        endX: options.x + options.width - options.width / 2,
        endY: window.innerHeight - options.y,
        opacity: 0.4,
      }
    ]
  }

  const obstacles = [
    ...getSquare({
      x: window.innerWidth / 2 - 50,
      y: window.innerHeight / 2 - 50,
      width: 100,
      height: 100,
    }),
  ]

  function processFrame() {
    const filteredSources = sources.filter(source => source.isVisible);

    const input = flattenSources(filteredSources);
    const obstaclesInput = flattenObstacles(obstacles);

    render(input, obstaclesInput);

    requestAnimationFrame(processFrame);
  }

  let reloadTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(reloadTimeout);
    reloadTimeout = setTimeout(() => {
      window.location.reload();
    }, 100);
  });

  function draw() {
    requestAnimationFrame(processFrame);
  }

  draw();
}

window.addEventListener('load', initEverything);
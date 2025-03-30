import { inject } from "@vercel/analytics"
import { MAX_SOURCES, MAX_OBSTACLES, PRETTY_COLORS } from './constants.js'
import { initializeEvents } from './events.js'

inject()

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

  const sources = [lightSource];

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

  function draw() {
    requestAnimationFrame(processFrame);
  }

  draw();
  
  // Initialize all event listeners
  initializeEvents(lightSource, sources, state, MAX_SOURCES);
}

window.addEventListener('load', initEverything);
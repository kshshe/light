import { inject } from "@vercel/analytics"
import { MAX_SOURCES, MAX_OBSTACLES } from './constants.js'
import { initializeEvents } from './events.js'
import { flattenSources } from './utils/flattenSources.js'
import { flattenObstacles } from './utils/flattenObstacles.js'
import { getCircle } from "./utils/getCircle.js"

inject()
const isDev = location.hostname === 'localhost';

const initEverything = () => {
  if ('serviceWorker' in navigator && !isDev) {
    console.log('Service Worker supported');
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), {
      scope: '/'
    })
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }

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

  const lightSource = {
    isVisible: false,
    position: {
      x: window.innerWidth * Math.random(),
      y: window.innerHeight * Math.random(),
    },
    intensity: 0,
    color: {
      r: 1,
      g: 1,
      b: 1,
    },
  }

  const sources = [lightSource];

  const obstacles = [
    ...getCircle({
      x: window.innerWidth / 2 - 50,
      y: window.innerHeight / 2 - 50,
      width: 100,
      height: 100,
    }),
  ]
  
  const desktopHints = document.querySelector('.desktop-hints');
  const mobileHints = document.querySelector('.mobile-hints');
  let shownHintElement = null;

  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    mobileHints.classList.remove('hidden');
    shownHintElement = mobileHints;
  } else {
    desktopHints.classList.remove('hidden');
    shownHintElement = desktopHints;
  }

  const fpsElement = document.getElementById('fps');
  const lastFramesTimes = [];

  setInterval(() => {
    const averageTime = lastFramesTimes.reduce((a, b) => a + b, 0) / lastFramesTimes.length;
    if (averageTime) {
      const averageFps = 1000 / averageTime;
      fpsElement.textContent = Math.round(averageFps);
      fpsElement.style.display = 'inline';
      lastFramesTimes.length = 0;
    }
  }, 1000);

  let lastFrameTime = performance.now();
  function processFrame() {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    lastFramesTimes.push(deltaTime);

    const filteredSources = sources.filter(source => source.isVisible);
    const filteredObstacles = obstacles.filter(obstacle => obstacle.isVisible);

    const input = flattenSources(filteredSources);
    const obstaclesInput = flattenObstacles(filteredObstacles);

    render(input, obstaclesInput);

    requestAnimationFrame(processFrame);
  }

  function draw() {
    requestAnimationFrame(processFrame);
  }

  const hintRect = shownHintElement.getBoundingClientRect();
  const hintRightX = hintRect.right;
  const hintTopY = hintRect.top;

  const hintPadding = 20;
  const topBorder = {
    isVisible: true,
    opacity: 0.8,
    startX: 1,
    startY: window.innerHeight - hintTopY + hintPadding,
    endX: hintRightX + hintPadding,
    endY: window.innerHeight - hintTopY + hintPadding,
  }
  const rightBorder = {
    isVisible: true,
    opacity: 0.8,
    startX: hintRightX + hintPadding,
    startY: 1,
    endX: hintRightX + hintPadding,
    endY: window.innerHeight - hintTopY + hintPadding,
  }
  
  obstacles.push(topBorder, rightBorder);

  console.log(obstacles);

  // Initialize all event listeners
  initializeEvents(lightSource, sources, state, MAX_SOURCES, obstacles);

  draw();
}

window.addEventListener('load', initEverything);
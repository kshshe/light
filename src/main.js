const MAX_SOURCES = 10;
const MAX_OBSTACLES = 10;

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

    let sumOfIntensities = 0;

    for (let i = 0; i < this.constants.sourcesCount; i++) {
      const startIndex = i * 3;
      const sourceX = sources[startIndex];
      const sourceY = sources[startIndex + 1];
      const sourceIntensity = sources[startIndex + 2];

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

        sumOfIntensities += intensity * opacitiesResult;
      }
    }

    this.color(sumOfIntensities, sumOfIntensities, sumOfIntensities);
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
      x: 400,
      y: 400,
    },
    intensity: 20,
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
  
  addEvent(['click'], (x, y) => {
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

  addEvent(['mouseleave', 'mouseout', 'touchend', 'touchcancel'], () => {
    state.isMovingSourceManually = false;
  });

  function flattenSources(sources) {
    const flattenedSources = sources.flatMap(source => [
      source.position.x,
      source.position.y,
      source.intensity,
    ]);

    if (flattenedSources.length < MAX_SOURCES * 3) {
      flattenedSources.push(...Array(MAX_SOURCES * 3 - flattenedSources.length).fill(0));
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
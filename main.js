const MAX_SOURCES = 10;

const initEverything = () => {
  const gpu = new GPU.GPU();
  const render = gpu.createKernel(function (sources) {
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
        sumOfIntensities += intensity;
      }
    }

    this.color(sumOfIntensities, sumOfIntensities, sumOfIntensities, 1);
  }, {
    constants: {
      sourcesCount: MAX_SOURCES,
    }
  })
    .setDynamicArguments(true)
    .setOutput([window.innerWidth, window.innerHeight])
    .setGraphical(true);

  const canvas = render.canvas;
  document.getElementsByTagName('body')[0].appendChild(canvas);

  const lightSource = {
    isVisible: false,
    position: {
      x: 400,
      y: 400,
    },
    intensity: 10,
  }

  const autoMovingSource = {
    isVisible: true,
    position: {
      x: 100,
      y: 100,
    },
    intensity: 10,
  }

  setInterval(() => {
    autoMovingSource.position.x = 200 + 100 * Math.cos(Date.now() / 1000);
    autoMovingSource.position.y = window.innerHeight - (200 + 100 * Math.sin(Date.now() / 1000));
  }, 10);

  window.addEventListener('mousemove', (e) => {
    lightSource.isVisible = true;
    lightSource.position.x = e.clientX;
    lightSource.position.y = window.innerHeight - e.clientY;
  });

  window.addEventListener('mouseleave', () => {
    lightSource.isVisible = false;
  });

  window.addEventListener('mouseout', () => {
    lightSource.isVisible = false;
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

  window.lightSource = lightSource;
  window.autoMovingSource = autoMovingSource;

  function processFrame() {
    const sources = [lightSource, autoMovingSource];
    const filteredSources = sources.filter(source => source.isVisible);

    const input = flattenSources(filteredSources);
    render(input);

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
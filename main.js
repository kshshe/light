const gpu = new GPU.GPU();
const render = gpu.createKernel(function(sources) {
  const x = this.thread.x;
  const y = this.thread.y;

  const sourcesCount = sources[0];
  let sourceX = 0;
  let sourceY = 0;
  let sourceIntensity = 0;

  let sumOfIntensities = 0;

  for (let i = 0; i < sourcesCount; i++) {
    sourceX = sources[1 + i * 3];
    sourceY = sources[2 + i * 3];
    sourceIntensity = sources[3 + i * 3];
    
    const distance = Math.sqrt((x - sourceX) ** 2 + (y - sourceY) ** 2);
    const intensity = sourceIntensity / distance;
    sumOfIntensities += intensity;
  }

  this.color(sumOfIntensities, sumOfIntensities, sumOfIntensities, 1);
})
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

window.addEventListener('mousemove', (e) => {
  lightSource.isVisible = true;
  lightSource.position.x = e.clientX;
  lightSource.position.y = window.innerHeight - e.clientY;
});

window.addEventListener('mouseleave', () => {
  lightSource.isVisible = false;
});

function flattenSources(sources) {
  const visibleSources = sources.filter(source => source.isVisible);
  return [
    visibleSources.length,
    ...visibleSources
      .flatMap(source => [
        source.position.x,
        source.position.y,
        source.intensity,
      ])
  ]
}

function processFrame() {
  const sources = [lightSource];

  const input = flattenSources(sources);
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
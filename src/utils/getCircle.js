import { MAX_OBSTACLES } from "../constants";

const CIRCLE_SEGMENTS = 6;

export const getCircle = (options) => {
  const leftX = options.x;
  const rightX = options.x + options.width;
  const topY = options.y;
  const bottomY = options.y + options.height;

  const centerX = (leftX + rightX) / 2;
  const centerY = (topY + bottomY) / 2;
  const radius = Math.sqrt((rightX - leftX) ** 2 + (bottomY - topY) ** 2) / 2;
  
  const points = [];

  let previousX = null;
  let previousY = null;
  for (let i = 0; i < CIRCLE_SEGMENTS + 1; i++) {
    const angle = (i / CIRCLE_SEGMENTS) * 2 * Math.PI;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    if (previousX !== null && previousY !== null) {
      points.push({
        startX: previousX,
        startY: previousY,
        endX: x,
        endY: y,
        opacity: 0.4,
        isVisible: true,
      });
    }

    previousX = x;
    previousY = y;
  }

  if (CIRCLE_SEGMENTS < 40) {
    const startTime = Date.now();
    setInterval(() => {
      const currentTime = Date.now();
      const deltaTime = currentTime - startTime;
      let previousX = null;
      let previousY = null;
      for (let i = 0; i <= points.length; i++) {
        const point = points[i % points.length];
        const newAngle = (i / CIRCLE_SEGMENTS) * 2 * Math.PI;
        const newAngleInGrad = newAngle * 180 / Math.PI;
        const newAngleWithDelta = newAngleInGrad - deltaTime / 200;
        const newAngleWithDeltaInRad = newAngleWithDelta * Math.PI / 180;
        const x = centerX + radius * Math.cos(newAngleWithDeltaInRad);
        const y = centerY + radius * Math.sin(newAngleWithDeltaInRad);

        if (previousX !== null && previousY !== null) {
          point.startX = previousX;
          point.startY = previousY;
          point.endX = x;
          point.endY = y;
        }

        previousX = x;
        previousY = y;
      }
    }, 16);
  }
  
  return points;
};
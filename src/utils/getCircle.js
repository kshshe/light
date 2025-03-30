import { MAX_OBSTACLES } from "../constants";

const CIRCLE_SEGMENTS = MAX_OBSTACLES;

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
      });
    }

    previousX = x;
    previousY = y;
  }
  
  return points;
}; 
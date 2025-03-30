import { MAX_OBSTACLES } from '../constants.js';

export const flattenObstacles = (obstacles) => {
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
}; 
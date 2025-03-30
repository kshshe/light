import { MAX_SOURCES } from '../constants.js';

export const flattenSources = (sources) => {
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
}; 
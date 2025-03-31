export const getSquare = (options) => {
  return [
    // Square
    // left side
    {
      startX: options.x,
      startY: window.innerHeight - options.y,
      endX: options.x,
      endY: window.innerHeight - (options.y + options.height),
      opacity: 0.4,
      isVisible: true,
    },
    // right side
    {
      startX: options.x + options.width,
      startY: window.innerHeight - options.y,
      endX: options.x + options.width,
      endY: window.innerHeight - (options.y + options.height),
      opacity: 0.4,
      isVisible: true,
    },
    // bottom side
    {
      startX: options.x,
      startY: window.innerHeight - (options.y + options.height),
      endX: options.x + options.width,
      endY: window.innerHeight - (options.y + options.height),
      opacity: 0.4,
      isVisible: true,
    },
    // top side
    {
      startX: options.x,
      startY: window.innerHeight - options.y,
      endX: options.x + options.width - options.width / 2,
      endY: window.innerHeight - options.y,
      opacity: 0.4,
      isVisible: true,
    }
  ];
}; 
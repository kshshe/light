export const getSquare = (options) => {
  return [
    // Square
    // left side
    {
      startX: options.x * 2,
      startY: window.innerHeight * 2 - (options.y * 2),
      endX: options.x * 2,
      endY: window.innerHeight * 2 - ((options.y + options.height) * 2),
      opacity: 0.4,
    },
    // right side
    {
      startX: (options.x + options.width) * 2,
      startY: window.innerHeight * 2 - (options.y * 2),
      endX: (options.x + options.width) * 2,
      endY: window.innerHeight * 2 - ((options.y + options.height) * 2),
      opacity: 0.4,
    },
    // bottom side
    {
      startX: options.x * 2,
      startY: window.innerHeight * 2 - ((options.y + options.height) * 2),
      endX: (options.x + options.width) * 2,
      endY: window.innerHeight * 2 - ((options.y + options.height) * 2),
      opacity: 0.4,
    },
    // top side
    {
      startX: options.x * 2,
      startY: window.innerHeight * 2 - (options.y * 2),
      endX: (options.x + options.width - options.width / 2) * 2,
      endY: window.innerHeight * 2 - (options.y * 2),
      opacity: 0.4,
    }
  ];
}; 
export const getRandomDirection = () => {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const sum = Math.sqrt(x * x + y * y);

    return {
        x: x / sum,
        y: y / sum,
    }
}
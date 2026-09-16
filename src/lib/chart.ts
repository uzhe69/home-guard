export function interpolateSeries(values: number[], progress: number) {
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];

  const clampedProgress = Math.min(1, Math.max(0, progress));
  if (clampedProgress === 0) return values[0];
  if (clampedProgress === 1) return values.at(-1)!;
  const position = clampedProgress * (values.length - 1);
  const index = Math.min(values.length - 2, Math.floor(position));
  const linearProgress = position - index;
  if (linearProgress === 0) return values[index];
  let low = 0;
  let high = 1;

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const candidate = (low + high) / 2;
    const inverse = 1 - candidate;
    const x =
      1.5 * inverse * inverse * candidate +
      1.5 * inverse * candidate * candidate +
      candidate * candidate * candidate;
    if (x < linearProgress) low = candidate;
    else high = candidate;
  }

  const curveProgress = (low + high) / 2;
  const inverse = 1 - curveProgress;
  const nextWeight =
    3 * inverse * curveProgress * curveProgress +
    curveProgress * curveProgress * curveProgress;

  return values[index] + (values[index + 1] - values[index]) * nextWeight;
}

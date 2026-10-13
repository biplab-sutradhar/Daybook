export async function saveLatest<T>(
  getLatest: () => T,
  save: (value: T) => Promise<void>,
  isEqual: (left: T, right: T) => boolean,
) {
  let snapshot = getLatest();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await save(snapshot);
    const latest = getLatest();
    if (isEqual(latest, snapshot)) return;
    snapshot = latest;
  }

  const finalValue = getLatest();
  if (!isEqual(finalValue, snapshot)) {
    await save(finalValue);
  }
}

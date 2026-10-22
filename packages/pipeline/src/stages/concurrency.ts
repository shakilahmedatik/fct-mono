/**
 * Bounded concurrency helper.
 *
 * `Promise.all` over an unbounded list of network/model calls can exhaust the
 * event loop, the connection pool or the machine's memory. The helpers below
 * keep a fixed number of tasks in flight.
 */

/**
 * Map over `items` with at most `concurrency` tasks in flight, preserving the
 * order of the results.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  if (items.length === 0) return results;

  const limit = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;

  const workers = Array.from({ length: limit }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);

  return results;
}

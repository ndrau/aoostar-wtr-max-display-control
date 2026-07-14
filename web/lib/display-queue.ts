type QueueTask<T> = () => Promise<T>;

let chain: Promise<unknown> = Promise.resolve();

export function enqueueDisplayTask<T>(task: QueueTask<T>): Promise<T> {
  const next = chain.then(task, task);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

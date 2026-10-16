export function runAfterResponse(work: () => Promise<void>, schedule?: (task: Promise<void>) => void) {
  const task = work().catch((error: unknown) => {
    console.error(error);
  });
  if (schedule) {
    try {
      schedule(task);
    } catch {
      // Outside a request the write is already running and the redirect does not wait for it.
    }
  }
  return task;
}

export async function withBrowserTimeout(promise, ms, message) {
  let timerId;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timerId = window.setTimeout(() => {
          reject(new Error(message));
        }, ms);
      })
    ]);
  } finally {
    if (timerId) {
      window.clearTimeout(timerId);
    }
  }
}

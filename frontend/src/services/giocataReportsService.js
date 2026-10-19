import api from "./api.js";

const pause = (ms, signal) => new Promise((resolve, reject) => {
  const abort = () => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    reject(new DOMException("Solicitud cancelada", "AbortError"));
  };
  const timer = setTimeout(() => {
    signal?.removeEventListener("abort", abort);
    resolve();
  }, ms);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
});

export async function getGiocataReport(path, params, signal) {
  // Cancel superseded selections before they reach the reporting connection.
  await pause(150, signal);
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await api.get(path, { params, signal });
    } catch (error) {
      if (error.response?.status !== 503 || error.response?.data?.code !== "REPORT_BUSY" || attempt >= 3) throw error;
      await pause(1000, signal);
    }
  }
}

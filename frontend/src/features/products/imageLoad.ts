export type ImageLoadStatus = 'loading' | 'loaded' | 'failed';

/** An image that has not loaded by then is treated as unavailable (e.g. a host that never answers). */
export const IMAGE_LOAD_TIMEOUT_MS = 8_000;

export interface ImageLoadTracker {
  /** Call from the image `load` event. */
  loaded: () => void;
  /** Call from the image `error` event (HTTP error, invalid image, blocked request). */
  failed: () => void;
  /** Stops the timeout, e.g. when the image URL changes or the component unmounts. */
  cancel: () => void;
}

/**
 * Tracks one image load and reports its final status once: `loaded`, or
 * `failed` on error or when `timeoutMs` passes without a load. Events after
 * the first final status are ignored, so a late `load` cannot revive a timed-out image.
 */
export function trackImageLoad(
  onSettled: (status: Exclude<ImageLoadStatus, 'loading'>) => void,
  timeoutMs: number = IMAGE_LOAD_TIMEOUT_MS,
): ImageLoadTracker {
  let settled = false;
  const settle = (status: Exclude<ImageLoadStatus, 'loading'>) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    onSettled(status);
  };
  const timer = setTimeout(() => settle('failed'), timeoutMs);

  return {
    loaded: () => settle('loaded'),
    failed: () => settle('failed'),
    cancel: () => {
      settled = true;
      clearTimeout(timer);
    },
  };
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IMAGE_LOAD_TIMEOUT_MS, trackImageLoad } from './imageLoad';

describe('trackImageLoad', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('uses a timeout of about 8 seconds', () => {
    expect(IMAGE_LOAD_TIMEOUT_MS).toBe(8_000);
  });

  it('reports "loaded" when the image loads before the timeout', () => {
    const onSettled = vi.fn();
    const tracker = trackImageLoad(onSettled);

    vi.advanceTimersByTime(IMAGE_LOAD_TIMEOUT_MS - 1);
    tracker.loaded();
    vi.advanceTimersByTime(IMAGE_LOAD_TIMEOUT_MS);

    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith('loaded');
  });

  it('reports "failed" on an error event (HTTP error or invalid image)', () => {
    const onSettled = vi.fn();
    const tracker = trackImageLoad(onSettled);

    tracker.failed();
    vi.advanceTimersByTime(IMAGE_LOAD_TIMEOUT_MS);

    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith('failed');
  });

  it('reports "failed" when nothing happens within the timeout', () => {
    const onSettled = vi.fn();
    trackImageLoad(onSettled);

    vi.advanceTimersByTime(IMAGE_LOAD_TIMEOUT_MS - 1);
    expect(onSettled).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith('failed');
  });

  it('ignores a late load after the timeout', () => {
    const onSettled = vi.fn();
    const tracker = trackImageLoad(onSettled);

    vi.advanceTimersByTime(IMAGE_LOAD_TIMEOUT_MS);
    tracker.loaded();

    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith('failed');
  });

  it('reports nothing after cancel (URL changed or component unmounted)', () => {
    const onSettled = vi.fn();
    const tracker = trackImageLoad(onSettled);

    tracker.cancel();
    vi.advanceTimersByTime(IMAGE_LOAD_TIMEOUT_MS * 2);
    tracker.loaded();
    tracker.failed();

    expect(onSettled).not.toHaveBeenCalled();
  });

  it('accepts a custom timeout', () => {
    const onSettled = vi.fn();
    trackImageLoad(onSettled, 100);

    vi.advanceTimersByTime(100);
    expect(onSettled).toHaveBeenCalledWith('failed');
  });
});

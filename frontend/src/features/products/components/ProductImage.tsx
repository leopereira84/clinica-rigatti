import { ImageIcon, ImageOff } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { cx } from '../../../lib/cx';
import { isHttpUrl } from '../../../lib/url';
import { type ImageLoadStatus, type ImageLoadTracker, trackImageLoad } from '../imageLoad';
import styles from './ProductImage.module.css';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

/**
 * Product image with explicit states: a neutral placeholder while loading,
 * "Sem imagem" when there is no valid URL, and "Imagem indisponível" when the
 * image fails or does not load within the timeout (see `imageLoad.ts`).
 */
export function ProductImage({ src, alt, className }: ProductImageProps) {
  const url = src?.trim() ?? '';
  const hasUrl = url !== '' && isHttpUrl(url);

  const [result, setResult] = useState<{ url: string; status: ImageLoadStatus } | null>(null);
  const trackerRef = useRef<ImageLoadTracker | null>(null);

  // Layout effect: the tracker exists before the browser can fire load/error for this URL.
  useLayoutEffect(() => {
    if (!hasUrl) return;
    const tracker = trackImageLoad((status) => setResult({ url, status }));
    trackerRef.current = tracker;
    return () => {
      tracker.cancel();
      if (trackerRef.current === tracker) trackerRef.current = null;
    };
  }, [url, hasUrl]);

  const status: ImageLoadStatus = result?.url === url ? result.status : 'loading';
  const canShow = hasUrl && status !== 'failed';
  const loaded = canShow && status === 'loaded';

  return (
    <div className={cx(styles.frame, className)}>
      {!canShow && (
        <div
          className={styles.placeholder}
          role="img"
          aria-label={hasUrl ? `${alt}: imagem indisponível` : `${alt}: sem imagem disponível`}
        >
          <ImageOff aria-hidden="true" />
          <span>{hasUrl ? 'Imagem indisponível' : 'Sem imagem'}</span>
        </div>
      )}

      {canShow && !loaded && (
        <div className={styles.placeholder} aria-hidden="true">
          <ImageIcon className={styles.loadingIcon} />
        </div>
      )}

      {canShow && (
        <img
          src={url}
          alt={alt}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => trackerRef.current?.loaded()}
          onError={() => trackerRef.current?.failed()}
          className={cx(styles.image, loaded && styles.imageLoaded)}
        />
      )}
    </div>
  );
}

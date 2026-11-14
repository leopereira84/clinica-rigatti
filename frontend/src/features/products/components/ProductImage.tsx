import { ImageIcon, ImageOff } from 'lucide-react';
import { useState } from 'react';
import { cx } from '../../../lib/cx';
import { isHttpUrl } from '../../../lib/url';
import styles from './ProductImage.module.css';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

/**
 * Product image with explicit states: a neutral placeholder while loading,
 * and a "Sem imagem" fallback when the URL is missing, invalid or fails.
 */
export function ProductImage({ src, alt, className }: ProductImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const url = src?.trim() ?? '';
  const canShow = url !== '' && isHttpUrl(url) && failedSrc !== url;
  const loaded = canShow && loadedSrc === url;

  return (
    <div className={cx(styles.frame, className)}>
      {!canShow && (
        <div className={styles.placeholder} role="img" aria-label={`${alt}: sem imagem disponível`}>
          <ImageOff aria-hidden="true" />
          <span>Sem imagem</span>
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
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedSrc(url)}
          onError={() => setFailedSrc(url)}
          className={cx(styles.image, loaded && styles.imageLoaded)}
        />
      )}
    </div>
  );
}

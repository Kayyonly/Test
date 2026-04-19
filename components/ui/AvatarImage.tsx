'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

type AvatarImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function AvatarImage({
  src,
  fallbackSrc = '/default-avatar.svg',
  alt,
  ...props
}: AvatarImageProps) {
  const normalizedSrc = src || fallbackSrc;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolvedSrc = failedSrc === normalizedSrc ? fallbackSrc : normalizedSrc;

  return (
    <Image
      {...props}
      src={resolvedSrc}
      alt={alt}
      onError={() => {
        if (normalizedSrc !== fallbackSrc) {
          setFailedSrc(normalizedSrc);
        }
      }}
    />
  );
}

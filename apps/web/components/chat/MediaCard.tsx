'use client';

import Image from 'next/image';

import { Download } from 'lucide-react';

import { env } from '@/lib/env';

export interface MediaCardProps {
  url: string;
  mime: string;
  alt?: string;
}

function isObjectStorage(url: string): boolean {
  try {
    return env.objectStorageHost !== '' && new URL(url).hostname === env.objectStorageHost;
  } catch {
    return false;
  }
}

/** Image or audio result (PDF `done.files`: permanent links). */
export function MediaCard({ url, mime, alt = 'Generated result' }: MediaCardProps) {
  const isAudio = mime.startsWith('audio/');
  const isImage = mime.startsWith('image/');
  return (
    <figure className="max-w-md overflow-hidden rounded-lg bg-bg-1 shadow-hairline">
      {isAudio ? (
        <audio src={url} controls className="w-full p-3">
          <track kind="captions" />
        </audio>
      ) : isImage ? (
        <div className="relative aspect-square w-full">
          <Image src={url} alt={alt} fill sizes="(max-width: 768px) 100vw, 448px" className="object-cover" unoptimized={!isObjectStorage(url)} />
        </div>
      ) : null}
      <figcaption className="flex items-center justify-between px-3 py-2 text-xs text-text-2">
        <span className="num">{mime}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-text-1 transition-colors hocus:bg-bg-2 hocus:text-text-0">
          <Download size={14} aria-hidden="true" /> Open
        </a>
      </figcaption>
    </figure>
  );
}

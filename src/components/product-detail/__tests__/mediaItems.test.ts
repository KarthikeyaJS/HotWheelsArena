import { describe, expect, it } from 'vitest';
import { makeProduct } from '@/components/product/__tests__/fixtures';
import { buildMediaItems, isModelSource, wrapIndex } from '../mediaItems';

const images = [
  { publicId: 'a', url: '/placeholders/coupe-blue.svg', alt: 'Blue' },
  { publicId: 'b', url: '/placeholders/coupe-white.svg', alt: '' },
  { publicId: 'c', url: '/placeholders/coupe-blue.svg', alt: 'Duplicate' },
];

describe('gallery media items', () => {
  it('puts the primary image first, dedupes by URL and fills missing alt text', () => {
    const items = buildMediaItems(
      makeProduct({ images, primaryImage: '/placeholders/coupe-white.svg' }),
    );
    expect(items.map((item) => item.kind)).toEqual(['image', 'image']);
    expect(items.map((item) => (item.kind === 'image' ? item.image.url : ''))).toEqual([
      '/placeholders/coupe-white.svg',
      '/placeholders/coupe-blue.svg',
    ]);
    expect(items[0]?.label).toBe('View 1 of 2: Twin Mill');
    expect(items[1]?.label).toBe('View 2 of 2: Blue');
  });

  it('always returns a placeholder item for products without images', () => {
    const items = buildMediaItems(makeProduct({ images: [], primaryImage: '' }));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'image' });
  });

  it('appends valid 3D models (the future viewer extension point)', () => {
    const items = buildMediaItems(makeProduct(), [
      { src: '/models/twin-mill.glb', alt: 'Twin Mill' },
      { src: '/models/not-a-model.png', alt: 'ignored' },
    ]);
    expect(items.map((item) => item.kind)).toEqual(['image', 'model']);
    expect(items[1]).toMatchObject({
      kind: 'model',
      src: '/models/twin-mill.glb',
      label: 'View 2 of 2: 3D model — Twin Mill',
    });
  });

  it('recognises glTF sources and wraps indices', () => {
    expect(isModelSource('/a/car.glb')).toBe(true);
    expect(isModelSource('/a/car.GLTF?v=2')).toBe(true);
    expect(isModelSource('/a/car.svg')).toBe(false);
    expect(isModelSource(null)).toBe(false);
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(5, 0)).toBe(0);
  });
});

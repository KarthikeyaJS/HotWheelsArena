import type { MutableRefObject, Ref, RefCallback } from 'react';

/**
 * Combines several refs (callback or object) into one callback ref.
 * Used by components that need an internal ref while still forwarding the caller's ref.
 */
export function mergeRefs<T>(...refs: ReadonlyArray<Ref<T> | undefined>): RefCallback<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(value);
      else if (ref != null) (ref as MutableRefObject<T | null>).current = value;
    }
  };
}

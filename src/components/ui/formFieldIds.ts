/** Id of a field's hint text: `${fieldId}-hint`. */
export function fieldHintId(fieldId: string): string {
  return `${fieldId}-hint`;
}

/** Id of a field's error text: `${fieldId}-error`. */
export function fieldErrorId(fieldId: string): string {
  return `${fieldId}-error`;
}

/** Space-separated id list for `aria-describedby` (`undefined` when empty). */
export function joinIds(
  ...ids: ReadonlyArray<string | false | null | undefined>
): string | undefined {
  const joined = ids
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .join(' ');
  return joined.length > 0 ? joined : undefined;
}

/**
 * `aria-describedby` value for a control inside `<FormField>`: the hint id and/or error id,
 * matching what FormField renders.
 * @example <Input id="pincode" aria-describedby={fieldDescribedBy('pincode', { hint, error })} />
 */
export function fieldDescribedBy(
  fieldId: string,
  { hint, error }: { hint?: unknown; error?: unknown },
): string | undefined {
  return joinIds(hint ? fieldHintId(fieldId) : null, error ? fieldErrorId(fieldId) : null);
}

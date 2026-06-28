export function isEmptyPlainObject(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  );
}

/** Recursively remove plain objects that are empty after cleaning nested values. */
export function omitEmptyObjects(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(omitEmptyObjects);
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const next = omitEmptyObjects(child);
    if (isEmptyPlainObject(next)) continue;
    cleaned[key] = next;
  }

  return cleaned;
}

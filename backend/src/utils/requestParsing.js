export function toArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('"[') && trimmed.endsWith(']"'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return toArray(parsed);
      } catch {
        // Fall back to comma parsing below.
      }
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

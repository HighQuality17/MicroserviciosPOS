export function normalizeNumberInput(
  value: string,
  options?: { allowDecimal?: boolean },
) {
  const allowDecimal = options?.allowDecimal ?? false;

  if (value === '') {
    return '';
  }

  const normalized = value.replace(',', '.');
  const pattern = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;

  if (!pattern.test(normalized)) {
    return null;
  }

  return normalized;
}

export function parseNumberInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}


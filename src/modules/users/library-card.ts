export function isLibraryCardExpired(expiresAt?: Date | string | null) {
  if (!expiresAt) return false;
  const expiryDate = getDateOnly(expiresAt);
  if (!expiryDate) return false;
  return expiryDate < getDateOnly(new Date())!;
}

function getDateOnly(value: Date | string) {
  if (typeof value === 'string') {
    const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnly) return dateOnly[1];
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

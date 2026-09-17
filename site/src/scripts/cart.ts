/*
  Cart state.

  Every piece is one of a kind, so a line is always quantity 1 and adding the
  same piece twice is a no-op rather than an increment. That is a deliberate
  constraint, not a limitation — if Matka ever sells editions, this is the file
  to revisit.

  Only ids are stored. Prices are never kept client-side, because the checkout
  function looks them up server-side and would ignore them anyway.
*/

const KEY = 'matka:cart';

export type Line = { id: string };

export function read(): Line[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((l): l is Line => !!l && typeof l.id === 'string');
  } catch {
    return [];
  }
}

function write(lines: Line[]): void {
  localStorage.setItem(KEY, JSON.stringify(lines));
  document.dispatchEvent(new CustomEvent('matka:cart-changed'));
}

export function has(id: string): boolean {
  return read().some((l) => l.id === id);
}

export function add(id: string): void {
  if (has(id)) return;
  write([...read(), { id }]);
}

export function remove(id: string): void {
  write(read().filter((l) => l.id !== id));
}

export function clear(): void {
  write([]);
}

/*
  Keep only ids that are still buyable, in a single write.

  Returns whether anything changed. Callers can re-enter safely: the second pass
  finds nothing to drop and returns false, so this terminates after one bounce
  through the change event.
*/
export function keepOnly(ids: Iterable<string>): boolean {
  const keep = new Set(ids);
  const lines = read();
  const next = lines.filter((l) => keep.has(l.id));
  if (next.length === lines.length) return false;
  write(next);
  return true;
}

export function count(): number {
  return read().length;
}

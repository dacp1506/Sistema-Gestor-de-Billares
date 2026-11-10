export type PosCartLine = {
  id_producto: string;
  nombre: string;
  precio: number;
  cantidad: number;
};

const carts = new Map<string, PosCartLine[]>();

export function loadPosCarts(): Record<string, PosCartLine[]> {
  return Object.fromEntries(Array.from(carts.entries()).map(([key, lines]) => [key, [...lines]]));
}

export function savePosCart(key: string, lines: PosCartLine[]) {
  if (!lines.length) carts.delete(key);
  else carts.set(key, [...lines]);
}

export function clearPosCarts() {
  carts.clear();
}

export function posCartKey(branchId: string, tableId?: string) {
  return tableId ? `branch:${branchId}:table:${tableId}` : `branch:${branchId}:direct`;
}

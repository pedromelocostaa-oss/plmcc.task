import { formatCents } from "./dashboard";

// Largura fixa: a máscara não pode revelar quantos dígitos o valor tem.
export const MASK = "R$ •••••";

export const HIDE_VALUES_KEY = "hq-hide-values";

export function formatMoney(cents: number, hidden: boolean): string {
  return hidden ? MASK : formatCents(cents);
}

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void };

export function readHidden(storage: StorageLike | undefined): boolean {
  try {
    return storage?.getItem(HIDE_VALUES_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeHidden(storage: StorageLike | undefined, hidden: boolean): void {
  try {
    storage?.setItem(HIDE_VALUES_KEY, hidden ? "1" : "0");
  } catch {
    /* modo privado ou armazenamento bloqueado: a escolha vale só nesta sessão */
  }
}

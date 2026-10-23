import { useCallback, useSyncExternalStore } from "react";
import { HIDE_VALUES_KEY, readHidden, writeHidden } from "./privacy";

const EVENT = "hq-hide-values-change";

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === HIDE_VALUES_KEY || e.key === null) onChange(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onChange);
  };
}

const getSnapshot = () => readHidden(typeof window === "undefined" ? undefined : window.localStorage);
// No servidor os valores nunca aparecem (os dados só chegam no navegador), então "visível" é seguro.
const getServerSnapshot = () => false;

// Preferência por aparelho: vale para todas as telas que usarem o hook e sincroniza entre abas.
export function useHideValues(): [boolean, () => void] {
  const hidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => {
    writeHidden(window.localStorage, !readHidden(window.localStorage));
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [hidden, toggle];
}

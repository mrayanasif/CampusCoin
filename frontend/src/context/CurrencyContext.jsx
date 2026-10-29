import { createContext, useCallback, useContext, useMemo, useState } from "react";

export const USD_TO_PKR_RATE = 278;

const CurrencyContext = createContext(null);

function readCurrency() {
  const stored = localStorage.getItem("currency");
  const currency = stored === "USD" ? "USD" : "PKR";
  if (stored !== currency) localStorage.setItem("currency", currency);
  return currency;
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(readCurrency);
  const toggleCurrency = useCallback(() => {
    setCurrency((current) => {
      const next = current === "PKR" ? "USD" : "PKR";
      localStorage.setItem("currency", next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ currency, toggleCurrency }), [currency, toggleCurrency]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used inside CurrencyProvider");
  return context;
}

export function fromPKR(amount, currency = readCurrency()) {
  const value = Number(amount) || 0;
  return currency === "USD" ? value / USD_TO_PKR_RATE : value;
}

export function toPKR(amount, currency = readCurrency()) {
  const value = Number(amount) || 0;
  return currency === "USD" ? value * USD_TO_PKR_RATE : value;
}

export function formatCurrency(amount, currency = readCurrency()) {
  const value = fromPKR(amount, currency);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currency === "USD" ? 2 : 0,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  }).format(value);
  return currency === "USD" ? `$${formatted}` : `₨ ${formatted}`;
}

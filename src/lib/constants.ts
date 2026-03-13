export const DEFAULT_CATEGORIES = [
  { name: "Comida", icon: "utensils", color: "#f97316" },
  { name: "Transporte", icon: "car", color: "#3b82f6" },
  { name: "Alojamiento", icon: "home", color: "#8b5cf6" },
  { name: "Entretenimiento", icon: "music", color: "#ec4899" },
  { name: "Compras", icon: "shopping-bag", color: "#14b8a6" },
  { name: "Servicios", icon: "zap", color: "#eab308" },
  { name: "Otros", icon: "more-horizontal", color: "#6b7280" },
] as const;

export const CURRENCIES = [
  { value: "ARS", label: "ARS - Peso Argentino" },
  { value: "USD", label: "USD - Dólar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "BRL", label: "BRL - Real" },
] as const;

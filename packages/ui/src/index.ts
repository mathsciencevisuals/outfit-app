export const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export const formatCurrency = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(value);

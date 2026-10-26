export interface OrderLine {
  nameRu: string;
  qty: number;
  priceTjs: number;
}

export interface OrderInput {
  lines: OrderLine[];
  deliveryFeeTjs: number;
  address: string;
  /** Guest language name in Russian, shown to the restaurant when it is not Russian. */
  guestLanguage?: string;
  table?: string;
}

export function orderTotal(lines: OrderLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty * l.priceTjs, 0);
}

/** Delivery order text for the restaurant. Always in Russian: staff read it. */
export function buildDeliveryMessage(order: OrderInput): string {
  const items = order.lines.map((l) => `— ${l.nameRu} × ${l.qty} = ${l.qty * l.priceTjs} смн`);
  const total = orderTotal(order.lines) + order.deliveryFeeTjs;
  const parts = [
    "Здравствуйте! Заказ на доставку с сайта:",
    ...items,
    `Доставка: ${order.deliveryFeeTjs} смн`,
    `Итого: ${total} смн`,
    `Адрес: ${order.address.trim() || "…"}`,
  ];
  if (order.guestLanguage) parts.push(`Язык гостя: ${order.guestLanguage}`);
  return parts.join("\n");
}

export function whatsappLink(phoneDigits: string, text?: string): string {
  const base = `https://wa.me/${phoneDigits.replace(/\D/g, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** t.me/<username>?text=… pre-fills the message field (Telegram deep link). */
export function telegramLink(username: string, text?: string): string {
  const base = `https://t.me/${username.replace(/^@/, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

// The one dial. Every price string in the app derives from here — never
// restate the number in copy (the TalkType $9→$24 hunt touched five files).
export const PRICING = {
  currentPrice: 9,
  currency: "AUD",
  productName: "DrShrink Passport",
  // Permanent unlock: one payment, no term, nothing auto-renews.
  termDays: null,
  get amountMinor() {
    return Math.round(this.currentPrice * 100);
  },
  get displayPrice() {
    return `A$${this.currentPrice.toFixed(0)}`;
  },
  get priceLine() {
    return `${this.displayPrice} once · permanent · no subscription`;
  },
};

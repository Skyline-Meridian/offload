const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

/** Pence to "£35.00". All prices are in pounds sterling. */
export function formatMoney(pence: number): string {
  return gbp.format(pence / 100)
}

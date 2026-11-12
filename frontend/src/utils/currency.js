const pkrNumber = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 0,
})

export function formatPKR(value) {
  const amount = Number(value)
  return `PKR ${pkrNumber.format(Number.isFinite(amount) ? amount : 0)}`
}

// フォーマット関数のテスト
function formatAmount(amount) {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numAmount)) {
    return '0'
  }
  
  const xymAmount = numAmount >= 1000000 ? numAmount / 1_000_000 : numAmount
  
  return new Intl.NumberFormat("ja-JP", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(xymAmount)
}

console.log('Format Amount Tests:');
console.log('2000000 (μXYM) →', formatAmount(2000000), 'XYM');
console.log('2 (XYM) →', formatAmount(2), 'XYM');
console.log('2000024 (μXYM) →', formatAmount(2000024), 'XYM');
console.log('153848 (μXYM) →', formatAmount(153848), 'XYM');
console.log('"2000000" (string) →', formatAmount("2000000"), 'XYM');

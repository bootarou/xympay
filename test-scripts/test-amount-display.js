// 金額表示の変換テスト
const testAmounts = [
  { input: 2000000, expected: "2" },
  { input: 1000000, expected: "1" },
  { input: 500000, expected: "0.5" },
  { input: 1500000, expected: "1.5" },
  { input: 2000000, expected: "2" },
  { input: 10000000, expected: "10" },
  { input: 123456789, expected: "123.456789" }
];

console.log('金額表示変換テスト:');
testAmounts.forEach(({ input, expected }) => {
  const result = Number((input / 1000000).toFixed(6)).toString();
  const isCorrect = result === expected;
  console.log(`${input} μXYM -> ${result} XYM (期待値: ${expected}) ${isCorrect ? '✅' : '❌'}`);
});

// 実際のAPIレスポンスを想定したテスト
const mockPaymentData = {
  amount: 2000000,
  product: {
    name: "2XYMテスト商品",
    price: 2.00
  }
};

console.log('\n実際のデータでのテスト:');
console.log('API amount:', mockPaymentData.amount);
console.log('変換後:', Number((mockPaymentData.amount / 1000000).toFixed(6)).toString());
console.log('商品価格:', mockPaymentData.product.price);

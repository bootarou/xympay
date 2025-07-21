// HEXメッセージの手動デコードテスト
function hexToUtf8(hex) {
  let result = '';
  for (let i = 0; i < hex.length; i += 2) {
    const hexByte = hex.substr(i, 2);
    const charCode = parseInt(hexByte, 16);
    if (charCode > 0) {
      result += String.fromCharCode(charCode);
    }
  }
  return result;
}

console.log('=== HEXメッセージデコードテスト ===');

// Transaction 2のメッセージをデコード
const hexMessage = '00506C65617365206E6F746520746861742074686973206D6F73616963206973';
console.log('HEXメッセージ:', hexMessage);

try {
  const decoded = hexToUtf8(hexMessage);
  console.log('デコード結果:', `"${decoded}"`);
} catch (error) {
  console.error('デコードエラー:', error);
}

// 他の例もテスト
const examples = [
  '58334B5753563350', // X3KWSV3P をHEXエンコードした想定
  '5258334D435A3150', // RX3MCZ1P をHEXエンコードした想定
  '30423348344838', // 0B3H4H8X をHEXエンコードした想定
];

console.log('\n=== 支払いIDのHEXエンコード例 ===');
examples.forEach((hex, index) => {
  try {
    const decoded = hexToUtf8(hex);
    console.log(`例${index + 1}: ${hex} → "${decoded}"`);
  } catch (error) {
    console.log(`例${index + 1}: ${hex} → デコードエラー`);
  }
});

// 逆方向：支払いIDをHEXエンコード
console.log('\n=== 支払いIDのHEXエンコード ===');
const paymentIds = ['X3KWSV3P', 'RX3MCZ1P', '0B3H4H8X'];
paymentIds.forEach(id => {
  let hex = '';
  for (let i = 0; i < id.length; i++) {
    hex += id.charCodeAt(i).toString(16).padStart(2, '0').toUpperCase();
  }
  console.log(`"${id}" → ${hex}`);
});

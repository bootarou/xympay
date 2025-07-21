const { symbolMonitor } = require('./src/lib/symbol/monitor');

async function testAmountCheck() {
  try {
    console.log('金額チェックテスト開始...');
    
    // テスト用パラメータ
    const recipientAddress = 'TCW7NSAHH3MTIBLNSOCOW2AOXQXMUUAFCXHMPKY';
    const expectedMessage = 'B66QJECT';
    const expectedAmount = 1500000; // マイクロXYM単位
    
    console.log('テストパラメータ:');
    console.log('受信アドレス:', recipientAddress);
    console.log('期待メッセージ:', expectedMessage);
    console.log('期待金額:', expectedAmount, 'μXYM (', expectedAmount / 1000000, 'XYM)');
    
    const result = await symbolMonitor.checkConfirmedTransactions(
      recipientAddress,
      expectedMessage,
      expectedAmount
    );
    
    if (result) {
      console.log('✅ トランザクション検知:', result);
    } else {
      console.log('❌ トランザクション未検知');
    }
    
  } catch (error) {
    console.error('テストエラー:', error);
  }
}

testAmountCheck();

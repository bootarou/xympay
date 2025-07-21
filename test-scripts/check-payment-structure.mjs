import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPaymentFields() {
  try {
    console.log('=== Payment テーブルの構造調査 ===\n');
    
    // 実際のPaymentレコードを1件取得してフィールド構造を確認
    const payment = await prisma.payment.findFirst();
    
    if (payment) {
      console.log('現在のPaymentレコードのフィールド:');
      console.log(Object.keys(payment));
      console.log('\nサンプルデータ:');
      console.log(JSON.stringify(payment, null, 2));
      
      // レート関連のフィールドがあるかチェック
      const hasRateFields = Object.keys(payment).some(key => 
        key.toLowerCase().includes('rate') || 
        key.toLowerCase().includes('exchange') ||
        key.toLowerCase().includes('jpy') ||
        key.toLowerCase().includes('currency')
      );
      
      console.log('\nレート関連のフィールドの存在: ', hasRateFields ? 'あり' : 'なし');
      
    } else {
      console.log('Paymentレコードが見つかりません');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentFields();

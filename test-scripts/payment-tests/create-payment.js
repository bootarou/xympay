// 決済作成用簡易スクリプト
const fetch = require('node-fetch');

async function createPayment() {
  try {
    console.log('決済作成開始...');
    
    const response = await fetch('http://localhost:3000/api/payment/9b902bab-b401-489f-bc40-fe3bfd8358e5', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formData: {}
      })
    });

    console.log('レスポンス状況:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('エラー:', errorText);
      return;
    }

    const data = await response.json();
    console.log('成功:', data);
    console.log('決済URL:', `http://localhost:3000/payment/${data.paymentId}`);
    
    return data.paymentId;
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

createPayment();

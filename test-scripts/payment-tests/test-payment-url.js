// 決済URL生成テスト用スクリプト
async function testPaymentUrlGeneration(productUuid) {
  try {
    console.log('=== 決済URL生成テスト開始 ===')
    console.log('商品UUID:', productUuid)
    
    const response = await fetch(`http://localhost:3001/api/payment/${productUuid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formData: {}
      })
    })

    console.log('レスポンス状況:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('エラーレスポンス:', errorText)
      return
    }

    const data = await response.json()
    console.log('成功レスポンス:', data)
    
    const paymentUrl = `http://localhost:3001/payment/${data.paymentId}`
    console.log('生成された決済URL:', paymentUrl)
    
    return {
      success: true,
      paymentId: data.paymentId,
      paymentUrl: paymentUrl
    }
    
  } catch (error) {
    console.error('テスト中にエラー:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 使用例（ブラウザコンソールで実行）
// testPaymentUrlGeneration('51864434-3c79-4014-a250-bed98901b522')

// このスクリプトをブラウザのコンソールにコピー＆ペーストして実行してください

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugPaymentCustomFields() {
  try {
    const paymentId = '38cbbe9a-4b9c-4640-9fa1-82083870550b'
    
    console.log('=== 決済のカスタムフィールド調査 ===')
    console.log('paymentId:', paymentId)
    
    // 決済情報を取得
    const payment = await prisma.payment.findUnique({
      where: { paymentId },
      include: {
        product: {
          include: {
            customFields: true
          }
        }
      }
    })
    
    if (!payment) {
      console.log('決済が見つかりません')
      return
    }
    
    console.log('\n--- 商品情報 ---')
    console.log('商品ID:', payment.product.id)
    console.log('商品名:', payment.product.name)
    
    console.log('\n--- カスタムフィールド ---')
    console.log('カスタムフィールド数:', payment.product.customFields.length)
    
    payment.product.customFields.forEach((field, index) => {
      console.log(`${index + 1}. ID: ${field.id}`)
      console.log(`   フィールド名: ${field.fieldName}`)
      console.log(`   タイプ: ${field.fieldType}`)
      console.log(`   必須: ${field.isRequired}`)
      console.log(`   オプション: ${field.options}`)
      console.log('---')
    })
    
    console.log('\n--- 決済のフォームデータ ---')
    console.log('formData:', payment.formData)
    
    if (payment.formData) {
      try {
        const parsedFormData = JSON.parse(payment.formData)
        console.log('パース済みformData:', parsedFormData)
      } catch (e) {
        console.log('formDataのパースに失敗:', e.message)
      }
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugPaymentCustomFields()

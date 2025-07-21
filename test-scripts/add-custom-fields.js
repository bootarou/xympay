const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addCustomFields() {
  try {
    console.log("=== カスタムフィールド追加開始 ===")
    
    // 商品を取得
    const products = await prisma.product.findMany({
      select: {
        id: true,
        uuid: true,
        name: true,
        customFields: true
      }
    })
    
    console.log(`対象商品数: ${products.length}`)
    
    for (const product of products) {
      console.log(`\n--- 商品: ${product.name} (UUID: ${product.uuid}) ---`)
      
      // 既存のカスタムフィールドがあるかチェック
      if (product.customFields.length > 0) {
        console.log('既にカスタムフィールドが存在します:', product.customFields.length, '個')
        continue
      }
        // カスタムフィールドを追加
      const customFields = [
        {
          productId: product.id,
          fieldName: 'お名前',
          fieldType: 'text',
          isRequired: true
        },
        {
          productId: product.id,
          fieldName: 'メールアドレス',
          fieldType: 'email',
          isRequired: true
        },
        {
          productId: product.id,
          fieldName: '配送先住所',
          fieldType: 'textarea',
          isRequired: false
        },
        {
          productId: product.id,
          fieldName: 'サイズ',
          fieldType: 'select',
          isRequired: false,
          options: JSON.stringify(['S', 'M', 'L', 'XL'])
        },
        {
          productId: product.id,
          fieldName: 'ギフト包装',
          fieldType: 'checkbox',
          isRequired: false
        }
      ]
      
      console.log('カスタムフィールドを追加中...')
        for (const field of customFields) {
        const created = await prisma.productCustomField.create({
          data: field
        })
        console.log(`  - ${field.fieldName} (${field.fieldType}) 追加完了`)
      }
      
      console.log(`商品 "${product.name}" にカスタムフィールド ${customFields.length} 個を追加しました`)
    }
    
    console.log("\n=== カスタムフィールド追加完了 ===")
    
  } catch (error) {
    console.error("カスタムフィールド追加エラー:", error)
  } finally {
    await prisma.$disconnect()
  }
}

addCustomFields()

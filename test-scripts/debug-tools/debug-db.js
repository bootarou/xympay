const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDB() {
  try {
    console.log("=== データベース状況確認 ===")
    
    // ユーザー数
    const userCount = await prisma.user.count()
    console.log(`ユーザー数: ${userCount}`)
      // 商品数とUUID
    const products = await prisma.product.findMany({
      select: {
        id: true,
        uuid: true,
        name: true,
        stock: true,
        userId: true,
        paymentAddress: true,
        customFields: {
          select: {
            id: true,
            fieldName: true,
            fieldType: true,
            isRequired: true,
            options: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            addresses: {
              select: {
                id: true,
                address: true,
                isDefault: true
              }
            }
          }
        }
      }
    })
    
    console.log(`商品数: ${products.length}`)
    
    products.forEach(product => {
      console.log(`\n--- 商品: ${product.name} ---`)
      console.log(`ID: ${product.id}, UUID: ${product.uuid}`)
      console.log(`在庫: ${product.stock}`)
      console.log(`商品の決済アドレス: ${product.paymentAddress}`)
      console.log(`ユーザーID: ${product.userId}`)
      console.log(`ユーザー名: ${product.user?.name}`)
      console.log(`ユーザーアドレス数: ${product.user?.addresses?.length || 0}`)
        if (product.user?.addresses) {
        product.user.addresses.forEach(addr => {
          console.log(`  - アドレス: ${addr.address} (デフォルト: ${addr.isDefault})`)
        })
      }
      
      // カスタムフィールド情報
      console.log(`カスタムフィールド数: ${product.customFields?.length || 0}`)
      if (product.customFields && product.customFields.length > 0) {
        product.customFields.forEach((field, index) => {
          console.log(`  フィールド${index + 1}: ${field.fieldName} (${field.fieldType}) 必須:${field.isRequired}`)
          if (field.options) {
            console.log(`    選択肢: ${field.options}`)
          }
        })
      }
    })
    
    // アドレス総数
    const addressCount = await prisma.address.count()
    console.log(`\nアドレス総数: ${addressCount}`)
    
    // ロック状況
    const lockCount = await prisma.productLock.count()
    console.log(`アクティブなロック数: ${lockCount}`)
    
  } catch (error) {
    console.error("データベース確認エラー:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDB()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // ユーザー一覧取得
  const users = await prisma.user.findMany({
    include: {
      addresses: true,
      products: true
    }
  })
  
  console.log('Users:', JSON.stringify(users, null, 2))
  
  // もしアドレスが設定されていない場合、テスト用アドレスを追加
  for (const user of users) {
    if (user.addresses.length === 0) {
      console.log(`Adding test address for user ${user.email}`)
      await prisma.address.create({
        data: {
          name: 'テスト受信アドレス',
          address: 'NDAPPH6ZGD4D6LBWFLGFZUT2KQ5OLBLU32K3HNY',
          type: 'payment',
          description: 'テスト用のSymbolアドレス',
          isDefault: true,
          userId: user.id
        }
      })
    }
  }
  
  console.log('Setup completed')
}

main()
  .catch((e) => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 12)
    
    const user = await prisma.user.create({
      data: {
        name: 'テストユーザー',
        email: 'test@example.com',
        password: hashedPassword,
      },
    })
    
    console.log('テストユーザーが作成されました:', user)
  } catch (error) {
    console.error('ユーザー作成エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()

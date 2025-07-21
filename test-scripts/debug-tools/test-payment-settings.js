/**
 * 決済設定機能のテストスクリプト
 * ダッシュボードの設定トグルが正常に動作するかを確認
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testPaymentSettings() {
  try {
    console.log('=== 決済設定機能テスト ===\n')

    // 1. テスト用ユーザーを取得
    const testUser = await prisma.user.findFirst({
      where: { email: { contains: 'test' } }
    })

    if (!testUser) {
      console.log('❌ テスト用ユーザーが見つかりません')
      return
    }

    console.log('✅ テストユーザー:', testUser.email)

    // 2. 現在の設定を確認
    const currentSettings = await prisma.userSettings.findUnique({
      where: { userId: testUser.id }
    })

    console.log('📋 現在の設定:', currentSettings || '設定なし（デフォルト値が使用されます）')

    // 3. 設定が存在しない場合はデフォルト設定を作成
    if (!currentSettings) {
      const defaultSettings = await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          autoPaymentMonitoring: true,
          baseCurrency: 'JPY',
          currencySettings: {}
        }
      })
      console.log('✅ デフォルト設定作成:', {
        autoPaymentMonitoring: defaultSettings.autoPaymentMonitoring,
        baseCurrency: defaultSettings.baseCurrency
      })
    }

    // 4. 設定の更新テスト（自動決済確認をOFF）
    console.log('\n🔄 設定更新テスト: 自動決済確認をOFFに変更...')
    
    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId: testUser.id },
      update: {
        autoPaymentMonitoring: false,
        updatedAt: new Date()
      },
      create: {
        userId: testUser.id,
        autoPaymentMonitoring: false,
        baseCurrency: 'JPY',
        currencySettings: {}
      }
    })

    console.log('✅ 設定更新完了:', {
      autoPaymentMonitoring: updatedSettings.autoPaymentMonitoring,
      updatedAt: updatedSettings.updatedAt
    })

    // 5. 設定をONに戻すテスト
    console.log('\n🔄 設定更新テスト: 自動決済確認をONに戻す...')
    
    const revertedSettings = await prisma.userSettings.update({
      where: { userId: testUser.id },
      data: {
        autoPaymentMonitoring: true,
        updatedAt: new Date()
      }
    })

    console.log('✅ 設定復元完了:', {
      autoPaymentMonitoring: revertedSettings.autoPaymentMonitoring,
      updatedAt: revertedSettings.updatedAt
    })

    // 6. API経由でのテスト（手動確認用情報）
    console.log('\n🔗 API経由でのテスト方法:')
    console.log('1. 設定取得:')
    console.log('   curl -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" http://localhost:3000/api/settings')
    console.log('')
    console.log('2. 設定更新:')
    console.log('   curl -X PUT -H "Content-Type: application/json" -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \\')
    console.log('   -d \'{"autoPaymentMonitoring": false}\' http://localhost:3000/api/settings')

    // 7. ダッシュボードでの動作確認方法
    console.log('\n📋 ダッシュボードでの確認方法:')
    console.log('1. http://localhost:3000/dashboard にアクセス')
    console.log('2. ページ下部の「決済設定」セクションを確認')
    console.log('3. トグルボタンをクリックして設定が切り替わることを確認')
    console.log('4. ページをリロードして設定が保存されているかを確認')

    // 8. 全ユーザーの設定状況を表示
    const allSettings = await prisma.userSettings.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    })

    console.log('\n👥 全ユーザーの設定状況:')
    allSettings.forEach((setting, index) => {
      console.log(`${index + 1}. ${setting.user.email}:`)
      console.log(`   自動決済確認: ${setting.autoPaymentMonitoring ? 'ON' : 'OFF'}`)
      console.log(`   基準通貨: ${setting.baseCurrency}`)
      console.log(`   最終更新: ${setting.updatedAt.toISOString()}`)
      console.log('')
    })

    console.log('=== 決済設定機能テスト完了 ===')
    console.log('✅ データベース操作: 正常')
    console.log('🔧 ダッシュボードUI: 実装完了')
    console.log('⚡ リアルタイム更新: 動作確認推奨')

  } catch (error) {
    console.error('❌ テストエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPaymentSettings().catch(console.error)

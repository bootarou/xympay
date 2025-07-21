import { prisma } from '../prisma'
import { emailService, PaymentNotificationData } from './email-service'

export interface NotificationOptions {
  userId: string
  paymentId: string
  type: 'payment_confirmed' | 'payment_expired' | 'payment_failed'
  data?: Partial<PaymentNotificationData>
}

class NotificationService {
  /**
   * 通知送信のメイン処理
   */
  async sendNotification(options: NotificationOptions): Promise<boolean> {
    try {
      // ユーザーの通知設定を確認
      const userSettings = await this.getUserNotificationSettings(options.userId)
      
      if (!userSettings.notifications) {
        console.log(`通知設定が無効: ユーザー ${options.userId}`)
        return false
      }

      // ユーザー情報と決済情報を取得
      const user = await prisma.user.findUnique({
        where: { id: options.userId },
        select: { email: true, name: true }
      })

      if (!user?.email) {
        console.warn(`ユーザーのメールアドレスが見つかりません: ${options.userId}`)
        return false
      }

      const payment = await prisma.payment.findUnique({
        where: { paymentId: options.paymentId },
        include: {
          product: true
        }
      })

      if (!payment) {
        console.warn(`決済が見つかりません: ${options.paymentId}`)
        return false
      }

      // 通知データを構築
      const notificationData: PaymentNotificationData = {
        paymentId: payment.paymentId,
        productName: payment.product.name,
        amount: Number(payment.amount),
        transactionId: payment.transactionId || undefined,
        exchangeRate: payment.exchangeRate ? Number(payment.exchangeRate) : undefined,
        baseCurrencyAmount: payment.baseCurrencyAmount ? Number(payment.baseCurrencyAmount) : undefined,
        baseCurrency: payment.baseCurrency || undefined,
        customerInfo: this.buildCustomerInfo(payment.formData),
        ...options.data
      }

      // 通知タイプ別の処理
      let success = false
      
      switch (options.type) {
        case 'payment_confirmed':
          if (userSettings.emailNotifications && emailService.isEnabled()) {
            success = await emailService.sendPaymentConfirmationEmail(user.email, notificationData)
          }
          break
          
        case 'payment_expired':
          if (userSettings.emailNotifications && emailService.isEnabled()) {
            success = await emailService.sendPaymentExpiredEmail(user.email, {
              paymentId: notificationData.paymentId,
              productName: notificationData.productName,
              amount: notificationData.amount
            })
          }
          break
          
        case 'payment_failed':
          // 将来的に実装予定
          console.log('payment_failed通知は将来実装予定')
          break
          
        default:
          console.warn(`未対応の通知タイプ: ${options.type}`)
          return false
      }

      if (success) {
        // 通知履歴を記録
        await this.logNotification({
          userId: options.userId,
          paymentId: options.paymentId,
          type: options.type,
          email: user.email,
          success: true
        })
        
        console.log(`✅ 通知送信成功: ${options.type} → ${user.email}`)
      } else {
        console.warn(`⚠️ 通知送信失敗: ${options.type} → ${user.email}`)
      }

      return success

    } catch (error) {
      console.error(`❌ 通知送信エラー:`, error)
      
      // エラーログを記録
      await this.logNotification({
        userId: options.userId,
        paymentId: options.paymentId,
        type: options.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return false
    }
  }

  /**
   * ユーザーの通知設定を取得
   */
  private async getUserNotificationSettings(userId: string) {
    try {
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
        select: {
          notifications: true,
          emailNotifications: true
        }
      })

      return {
        notifications: userSettings?.notifications ?? true,
        emailNotifications: userSettings?.emailNotifications ?? true
      }
    } catch (error) {
      console.warn('通知設定取得エラー:', error)
      // エラー時はデフォルトで通知有効
      return {
        notifications: true,
        emailNotifications: true
      }
    }
  }

  /**
   * フォームデータから顧客情報を構築
   */
  private buildCustomerInfo(formData: unknown): Record<string, string> {
    const customerInfo: Record<string, string> = {}
    
    if (formData && typeof formData === 'object') {
      Object.entries(formData as Record<string, unknown>).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          customerInfo[key] = String(value)
        }
      })
    }
    
    return customerInfo
  }

  /**
   * 通知履歴をログに記録
   */
  private async logNotification(logData: {
    userId: string
    paymentId: string
    type: string
    email?: string
    success: boolean
    error?: string
  }) {
    try {
      // 将来的にNotificationLogテーブルを作成して履歴管理する場合はここに実装
      console.log('通知ログ:', {
        timestamp: new Date().toISOString(),
        ...logData
      })
    } catch (error) {
      console.error('通知ログ記録エラー:', error)
    }
  }

  /**
   * テスト通知送信
   */
  async sendTestNotification(userEmail: string): Promise<boolean> {
    if (!emailService.isEnabled()) {
      console.warn('メールサービスが無効化されています')
      return false
    }

    return await emailService.sendTestEmail(userEmail)
  }

  /**
   * 通知サービスの状態確認
   */
  getServiceStatus() {
    return {
      emailService: {
        enabled: emailService.isEnabled(),
        configured: !!(
          process.env.SMTP_HOST &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASS
        )
      }
    }
  }
}

// シングルトンインスタンス
export const notificationService = new NotificationService()

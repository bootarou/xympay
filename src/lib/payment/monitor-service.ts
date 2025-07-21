import { prisma } from '../prisma'
import { symbolMonitor } from '../symbol/monitor'
import { notificationService } from '../notification/notification-service'

interface ActivePayment {
  paymentId: string
  addressId: string
  address: string
  amount: number
  expireAt: Date
  intervalId?: NodeJS.Timeout
}

class PaymentMonitorService {
  private activePayments: Map<string, ActivePayment> = new Map()
  private globalIntervalId?: NodeJS.Timeout
  private isRunning = false

  constructor() {
    // サーバー起動時に既存の pending 決済を監視対象に追加
    this.initializeExistingPayments()
  }

  /**
   * サーバー起動時に既存のpending決済を監視対象に追加
   */
  private async initializeExistingPayments() {
    try {
      console.log('=== 既存決済の監視初期化 ===')
      
      const pendingPayments = await prisma.payment.findMany({
        where: {
          status: 'pending',
          expireAt: {
            gt: new Date()
          }
        },
        include: {
          address: true
        }
      })

      console.log(`監視対象の決済: ${pendingPayments.length}件`)

      for (const payment of pendingPayments) {
        this.addPaymentToMonitoring({
          paymentId: payment.paymentId,
          addressId: payment.addressId,
          address: payment.address.address,
          amount: Number(payment.amount),
          expireAt: payment.expireAt
        })
      }

      this.startGlobalMonitoring()
      
    } catch (error) {
      console.error('監視初期化エラー:', error)
    }
  }

  /**
   * 新しい決済を監視対象に追加
   */
  addPaymentToMonitoring(payment: Omit<ActivePayment, 'intervalId'>) {
    console.log(`監視追加: ${payment.paymentId}`)
    this.activePayments.set(payment.paymentId, payment)
    
    // グローバル監視が開始されていない場合は開始
    if (!this.isRunning) {
      this.startGlobalMonitoring()
    }
  }

  /**
   * 決済を監視対象から削除
   */
  removePaymentFromMonitoring(paymentId: string) {
    console.log(`監視削除: ${paymentId}`)
    const payment = this.activePayments.get(paymentId)
    if (payment?.intervalId) {
      clearInterval(payment.intervalId)
    }
    this.activePayments.delete(paymentId)
  }

  /**
   * グローバル監視開始（全決済を定期的にチェック）
   */
  private startGlobalMonitoring() {
    if (this.isRunning) return

    console.log('=== グローバル決済監視開始 ===')
    this.isRunning = true

    // 10秒間隔で全決済をチェック
    this.globalIntervalId = setInterval(async () => {
      await this.checkAllPayments()
    }, 10000)
  }

  /**
   * 全ての監視対象決済をチェック
   */
  private async checkAllPayments() {
    const currentTime = new Date()
    const expiredPayments: string[] = []

    for (const [paymentId, payment] of this.activePayments) {
      try {
        // 期限切れチェック
        if (payment.expireAt < currentTime) {
          console.log(`決済期限切れ: ${paymentId}`)
          await this.updatePaymentStatus(paymentId, 'expired')
          
          // 期限切れ通知を送信
          try {
            const paymentData = await prisma.payment.findUnique({
              where: { paymentId },
              select: { userId: true }
            })
            
            if (paymentData?.userId) {
              await notificationService.sendNotification({
                userId: paymentData.userId,
                paymentId: paymentId,
                type: 'payment_expired'
              })
            }
          } catch (notificationError) {
            console.error(`期限切れ通知送信エラー (${paymentId}):`, notificationError)
            // 通知エラーは期限切れ処理には影響させない
          }
          
          expiredPayments.push(paymentId)
          continue
        }

        // Symbol取引チェック
        await this.checkPaymentTransaction(payment)

      } catch (error) {
        console.error(`決済チェックエラー (${paymentId}):`, error)
      }
    }

    // 期限切れ決済を監視対象から削除
    expiredPayments.forEach(paymentId => {
      this.removePaymentFromMonitoring(paymentId)
    })

    // 監視対象がなくなった場合は停止
    if (this.activePayments.size === 0) {
      this.stopGlobalMonitoring()
    }
  }

  /**
   * 個別決済の取引チェック
   */
  private async checkPaymentTransaction(payment: ActivePayment) {
    try {
      const transaction = await symbolMonitor.checkConfirmedTransactions(
        payment.address,
        payment.paymentId,
        payment.amount
      )

      if (transaction) {
        console.log(`✅ 取引検知: ${payment.paymentId}`)
        console.log('取引詳細:', {
          hash: transaction.transactionId,
          amount: transaction.amount,
          message: transaction.message,
          sender: transaction.senderAddress
        })

        // データベース更新
        await this.updatePaymentStatus(
          payment.paymentId, 
          'confirmed',
          transaction.transactionId,
          transaction.senderAddress
        )

        // 決済完了通知を送信
        try {
          const paymentData = await prisma.payment.findUnique({
            where: { paymentId: payment.paymentId },
            select: { userId: true }
          })
          
          if (paymentData?.userId) {
            await notificationService.sendNotification({
              userId: paymentData.userId,
              paymentId: payment.paymentId,
              type: 'payment_confirmed'
            })
          }
        } catch (notificationError) {
          console.error(`通知送信エラー (${payment.paymentId}):`, notificationError)
          // 通知エラーは決済確認処理には影響させない
        }

        // 監視から削除
        this.removePaymentFromMonitoring(payment.paymentId)
      }

    } catch (error) {
      console.error(`取引チェックエラー (${payment.paymentId}):`, error)
    }
  }

  /**
   * 決済ステータス更新
   */
  private async updatePaymentStatus(
    paymentId: string, 
    status: string,
    transactionId?: string,
    senderAddress?: string
  ) {
    try {
      const updateData: {
        status: string
        updatedAt: Date
        confirmedAt?: Date
        transactionId?: string
        senderAddress?: string
        exchangeRate?: number
        baseCurrency?: string
        baseCurrencyAmount?: number
        rateProvider?: string
        rateTimestamp?: Date
      } = {
        status,
        updatedAt: new Date()
      }

      if (status === 'confirmed') {
        updateData.confirmedAt = new Date()
        updateData.transactionId = transactionId
        updateData.senderAddress = senderAddress
        
        // 決済確認時に為替レート情報を取得・保存
        try {
          console.log('決済確認時の為替レート取得中...')
          const exchangeRateResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/exchange-rate?from=XYM&to=JPY`)
          
          if (exchangeRateResponse.ok) {
            const exchangeRateData = await exchangeRateResponse.json()
            
            if (exchangeRateData.success && exchangeRateData.data) {
              const rateInfo = exchangeRateData.data
              
              // 決済金額を取得
              const payment = await prisma.payment.findUnique({
                where: { paymentId }
              })
              
              if (payment) {
                const amountInXym = Number(payment.amount) / 1000000
                const baseCurrencyAmount = amountInXym * rateInfo.rate
                
                updateData.exchangeRate = rateInfo.rate
                updateData.baseCurrency = rateInfo.toCurrency
                updateData.baseCurrencyAmount = baseCurrencyAmount
                updateData.rateProvider = rateInfo.provider
                updateData.rateTimestamp = new Date(rateInfo.timestamp)
                
                console.log('為替レート情報を保存:', {
                  rate: rateInfo.rate,
                  amountXym: amountInXym,
                  baseCurrencyAmount: baseCurrencyAmount,
                  provider: rateInfo.provider
                })
              }
            } else {
              console.warn('為替レート取得失敗:', exchangeRateData.error)
            }
          } else {
            console.warn('為替レートAPI呼び出し失敗:', exchangeRateResponse.status)
          }
        } catch (rateError) {
          console.error('為替レート取得エラー:', rateError)
          // エラーが発生しても決済確認処理は継続
        }
      }

      await prisma.payment.update({
        where: { paymentId },
        data: updateData
      })

      // 決済確認時に商品の在庫を減らす
      if (status === 'confirmed') {
        try {
          console.log('在庫更新処理開始...')
          
          // 決済情報を取得（商品情報も含む）
          const paymentWithProduct = await prisma.payment.findUnique({
            where: { paymentId },
            include: {
              product: true
            }
          })

          if (paymentWithProduct?.product) {
            // 在庫チェック
            if (paymentWithProduct.product.stock <= 0) {
              console.warn(`在庫不足により在庫減算をスキップ: ${paymentWithProduct.product.name} (現在の在庫: ${paymentWithProduct.product.stock})`)
            } else {
              // 在庫を1減らす（トランザクションで安全に実行）
              const updatedProduct = await prisma.product.update({
                where: { 
                  id: paymentWithProduct.product.id,
                  stock: { gt: 0 } // 在庫が0より大きい場合のみ更新
                },
                data: {
                  stock: {
                    decrement: 1
                  }
                }
              })

              if (updatedProduct) {
                console.log(`✅ 在庫更新完了: ${paymentWithProduct.product.name} (残り在庫: ${updatedProduct.stock})`)
              } else {
                console.warn(`在庫更新失敗（在庫不足の可能性）: ${paymentWithProduct.product.name}`)
              }
            }
          } else {
            console.warn('決済に関連する商品が見つかりません:', paymentId)
          }
        } catch (stockError) {
          console.error(`在庫更新エラー (${paymentId}):`, stockError)
          // 在庫更新に失敗しても決済確認処理は継続
        }
      }

      console.log(`決済ステータス更新: ${paymentId} → ${status}`)

    } catch (error) {
      console.error(`ステータス更新エラー (${paymentId}):`, error)
    }
  }

  /**
   * グローバル監視停止
   */
  private stopGlobalMonitoring() {
    console.log('=== グローバル決済監視停止 ===')
    this.isRunning = false
    
    if (this.globalIntervalId) {
      clearInterval(this.globalIntervalId)
      this.globalIntervalId = undefined
    }
  }

  /**
   * サービス終了時のクリーンアップ
   */
  shutdown() {
    console.log('=== 決済監視サービス終了 ===')
    this.stopGlobalMonitoring()
    
    // 個別監視も全て停止
    for (const payment of this.activePayments.values()) {
      if (payment.intervalId) {
        clearInterval(payment.intervalId)
      }
    }
    
    this.activePayments.clear()
  }

  /**
   * 現在の監視状況取得
   */
  getMonitoringStatus() {
    return {
      isRunning: this.isRunning,
      activePaymentsCount: this.activePayments.size,
      activePayments: Array.from(this.activePayments.keys())
    }
  }
}

// シングルトンインスタンス
export const paymentMonitorService = new PaymentMonitorService()

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  paymentMonitorService.shutdown()
  process.exit(0)
})

process.on('SIGTERM', () => {
  paymentMonitorService.shutdown()
  process.exit(0)
})

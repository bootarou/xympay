import { symbolConfig } from './config'

/**
 * 決済情報の型定義
 */
export interface PaymentData {
  paymentId: string
  productId: string
  recipientAddress: string
  amount: number
  message: string
  expireAt: Date
  formData?: Record<string, any>
}

/**
 * 決済ステータス
 */
export type PaymentStatus = 'pending' | 'confirmed' | 'expired' | 'cancelled'

/**
 * 決済情報を作成
 */
export function createPaymentData(
  paymentId: string,
  productId: string,
  recipientAddress: string,
  amount: number,
  formData?: Record<string, any>
): PaymentData {
  return {
    paymentId,
    productId,
    recipientAddress,
    amount,
    message: paymentId, // メッセージには決済IDを使用
    expireAt: new Date(Date.now() + symbolConfig.paymentExpiryMinutes * 60 * 1000),
    formData
  }
}

/**
 * 決済の残り時間を計算
 */
export function calculateRemainingTime(expireAt: Date): {
  totalSeconds: number
  minutes: number
  seconds: number
  isExpired: boolean
} {
  const now = new Date()
  const totalSeconds = Math.max(0, Math.floor((expireAt.getTime() - now.getTime()) / 1000))
  
  return {
    totalSeconds,
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
    isExpired: totalSeconds <= 0
  }
}

/**
 * 決済状況の表示メッセージを生成
 */
export function getPaymentStatusMessage(
  status: PaymentStatus,
  remainingTime?: { minutes: number; seconds: number }
): string {
  switch (status) {
    case 'pending':
      if (remainingTime) {
        return `お支払い確認中... 残り${remainingTime.minutes}分${remainingTime.seconds.toString().padStart(2, '0')}秒`
      }
      return 'お支払い確認中...'
    
    case 'confirmed':
      return 'お支払いが確認されました。ありがとうございます！'
    
    case 'expired':
      return 'お支払い期限が切れました。もう一度お試しください。'
    
    case 'cancelled':
      return 'お支払いがキャンセルされました。'
    
    default:
      return 'お支払い状況を確認中...'
  }
}

/**
 * Symbol決済用の金額フォーマット
 */
export function formatSymbolAmount(amount: number): string {
  return amount.toString()
}

/**
 * 決済URLの生成
 */
export function generatePaymentUrl(paymentId: string): string {
  return `/payment/${paymentId}`
}

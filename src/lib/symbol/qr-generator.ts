import QRCode from 'qrcode'
import { symbolConfig, createSymbolPaymentUri } from './config'
import { PaymentData } from './payment'
import { qrPluginManager, PaymentRequest, QRCodeOptions, WalletInfo } from './plugins'

/**
 * QRコード生成関数 (プラグイン対応)
 */
export async function generatePaymentQR(
  recipientAddress: string,
  amount: number | string,
  paymentId: string,
  walletId?: string
): Promise<string> {
  try {
    const request: PaymentRequest = {
      recipientAddress,
      amount,
      paymentId,
      currency: symbolConfig.networkCurrency,
      message: paymentId
    }

    const options: QRCodeOptions = {
      width: symbolConfig.qrCodeOptions.width,
      margin: symbolConfig.qrCodeOptions.margin,
      color: symbolConfig.qrCodeOptions.color,
      format: 'dataurl'
    }

    if (walletId) {
      const result = await qrPluginManager.generateQRCode(walletId, request, options)
      return result.qrCode
    } else {
      const result = await qrPluginManager.generateDefaultQRCode(request, options)
      return result.qrCode
    }
  } catch (error) {
    console.error('QRコード生成エラー:', error)
    throw new Error('QRコードの生成に失敗しました')
  }
}

/**
 * PaymentDataからQRコードを生成（フロントエンド用）
 */
export async function generateQRCode(paymentData: PaymentData, walletId?: string): Promise<string> {
  return generatePaymentQR(
    paymentData.recipientAddress,
    paymentData.amount,
    paymentData.paymentId,
    walletId
  )
}

/**
 * 複数ウォレット対応のQRコード生成（新機能）
 */
export async function generateQRCodeForWallet(
  paymentData: PaymentData, 
  walletId: string
): Promise<{ qrCode: string; uri: string; wallet: WalletInfo }> {
  // μXYM単位をXYM単位に変換（1,000,000で割る）
  const amountInXym = paymentData.amount / 1000000;
  
  console.log('QR生成 - 金額変換:', {
    originalAmount: paymentData.amount,
    originalUnit: 'μXYM',
    convertedAmount: amountInXym,
    convertedUnit: 'XYM'
  });
  
  const request: PaymentRequest = {
    recipientAddress: paymentData.recipientAddress,
    amount: amountInXym,
    paymentId: paymentData.paymentId,
    currency: symbolConfig.networkCurrency,
    message: paymentData.paymentId
  }

  const options: QRCodeOptions = {
    width: symbolConfig.qrCodeOptions.width,
    margin: symbolConfig.qrCodeOptions.margin,
    color: symbolConfig.qrCodeOptions.color,
    format: 'dataurl'
  }

  const result = await qrPluginManager.generateQRCode(walletId, request, options)
  return {
    qrCode: result.qrCode,
    uri: result.uri,
    wallet: result.wallet
  }
}

/**
 * QRコードをSVG形式で生成
 */
export async function generatePaymentQRSvg(
  recipientAddress: string,
  amount: number | string,
  paymentId: string
): Promise<string> {
  try {
    const paymentUri = createSymbolPaymentUri(recipientAddress, amount, paymentId)
    const qrCodeSvg = await QRCode.toString(paymentUri, {
      type: 'svg',
      ...symbolConfig.qrCodeOptions
    })
    
    return qrCodeSvg
  } catch (error) {
    console.error('QRコード(SVG)生成エラー:', error)
    throw new Error('QRコード(SVG)の生成に失敗しました')
  }
}

/**
 * 決済情報の検証
 */
export function validatePaymentData(
  address: string,
  amount: number | string,
  paymentId: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // アドレス検証
  if (!address || !/^[A-Z0-9]{39}$/.test(address)) {
    errors.push('無効なSymbolアドレスです')
  }
  
  // 金額検証
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (!numAmount || numAmount <= 0) {
    errors.push('無効な金額です')
  }
  
  // 決済ID検証
  if (!paymentId || paymentId.length < 8) {
    errors.push('無効な決済IDです')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

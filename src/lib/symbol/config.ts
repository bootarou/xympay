import { randomUUID } from 'crypto'

// Symbol ネットワーク設定
export const symbolConfig = {
  // テストネットのノード設定
  nodeUrl: process.env.SYMBOL_NODE_URL || 'http://testnet1.symbol-mikun.net:3000',
  
  // ネットワーク設定
  networkCurrency: process.env.SYMBOL_NETWORK_CURRENCY || '72C0212E67A08BCE',
  
  // 着金検知のチェック間隔（ミリ秒）
  checkIntervalMs: parseInt(process.env.CHECK_INTERVAL_MS || '60000', 10),
  
  // 決済の有効期限（5分）
  paymentExpiryMinutes: 5,
  
  // QRコード設定
  qrCodeOptions: {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  }
}

// Symbol ディープリンク生成
export function createSymbolPaymentUri(
  recipientAddress: string,
  amount: number | string,
  message: string
): string {
  return `symbol://payment?recipient=${recipientAddress}&amount=${amount}&message=${message}`
}

// 支払いIDの生成（UUIDを使用）
export function generatePaymentId(): string {
  return randomUUID()
}

// アドレス検証
export function isValidSymbolAddress(address: string): boolean {
  // Symbol アドレスは39文字の大文字英数字
  return /^[A-Z0-9]{39}$/.test(address)
}

// 決済期限の計算
export function calculatePaymentExpiry(): Date {
  return new Date(Date.now() + symbolConfig.paymentExpiryMinutes * 60 * 1000)
}

import nodemailer from 'nodemailer'

export interface EmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
}

export interface PaymentNotificationData {
  paymentId: string
  productName: string
  amount: number
  customerInfo?: Record<string, string | number | boolean>
  transactionId?: string
  exchangeRate?: number
  baseCurrencyAmount?: number
  baseCurrency?: string
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    try {
      // 環境変数が設定されている場合のみトランスポーターを初期化
      if (
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
      ) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        })

        console.log('✅ メールサービス初期化完了')
      } else {
        console.warn('⚠️ SMTP設定が不完全です。メール機能は無効化されています。')
        console.warn('必要な環境変数: SMTP_HOST, SMTP_USER, SMTP_PASS')
      }
    } catch (error) {
      console.error('❌ メールサービス初期化エラー:', error)
    }
  }

  /**
   * メール送信が有効かどうかをチェック
   */
  isEnabled(): boolean {
    return this.transporter !== null
  }

  /**
   * 基本的なメール送信
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.warn('メールサービスが無効化されています')
      return false
    }

    try {
      const result = await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      console.log('✅ メール送信成功:', result.messageId)
      return true
    } catch (error) {
      console.error('❌ メール送信エラー:', error)
      return false
    }
  }

  /**
   * 決済完了通知メール
   */
  async sendPaymentConfirmationEmail(
    userEmail: string,
    data: PaymentNotificationData
  ): Promise<boolean> {
    const subject = `決済完了のお知らせ - ${data.productName}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">決済完了のお知らせ</h1>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <p>お客様の決済が正常に完了いたしました。</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">決済情報</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">決済ID:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.paymentId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">商品名:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.productName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">金額:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${(data.amount / 1000000).toLocaleString()} XYM</td>
              </tr>
              ${data.baseCurrencyAmount && data.baseCurrency ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">参考価格:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.baseCurrencyAmount.toLocaleString()} ${data.baseCurrency}</td>
              </tr>
              ` : ''}
              ${data.transactionId ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">取引ID:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px;">${data.transactionId}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${data.customerInfo && Object.keys(data.customerInfo).length > 0 ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">ご入力情報</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${Object.entries(data.customerInfo).map(([key, value]) => `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">${key}:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${value}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          ` : ''}
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            このメールは自動送信されています。<br>
            ご不明な点がございましたら、サポートまでお問い合わせください。
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2024 XYMPay. All rights reserved.</p>
        </div>
      </div>
    `

    const text = `
決済完了のお知らせ

お客様の決済が正常に完了いたしました。

決済情報:
- 決済ID: ${data.paymentId}
- 商品名: ${data.productName}
- 金額: ${(data.amount / 1000000).toLocaleString()} XYM
${data.baseCurrencyAmount && data.baseCurrency ? `- 参考価格: ${data.baseCurrencyAmount.toLocaleString()} ${data.baseCurrency}` : ''}
${data.transactionId ? `- 取引ID: ${data.transactionId}` : ''}

このメールは自動送信されています。
    `

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text,
    })
  }

  /**
   * 決済期限切れ通知メール
   */
  async sendPaymentExpiredEmail(
    userEmail: string,
    data: Pick<PaymentNotificationData, 'paymentId' | 'productName' | 'amount'>
  ): Promise<boolean> {
    const subject = `決済期限切れのお知らせ - ${data.productName}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">決済期限切れのお知らせ</h1>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <p>申し訳ございませんが、以下の決済の期限が切れました。</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">決済情報</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">決済ID:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.paymentId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">商品名:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.productName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">金額:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${(data.amount / 1000000).toLocaleString()} XYM</td>
              </tr>
            </table>
          </div>
          
          <p style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; color: #856404;">
            <strong>再購入をご希望の場合は、商品ページから改めてお手続きください。</strong>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            このメールは自動送信されています。<br>
            ご不明な点がございましたら、サポートまでお問い合わせください。
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2024 XYMPay. All rights reserved.</p>
        </div>
      </div>
    `

    const text = `
決済期限切れのお知らせ

申し訳ございませんが、以下の決済の期限が切れました。

決済情報:
- 決済ID: ${data.paymentId}
- 商品名: ${data.productName}
- 金額: ${(data.amount / 1000000).toLocaleString()} XYM

再購入をご希望の場合は、商品ページから改めてお手続きください。

このメールは自動送信されています。
    `

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text,
    })
  }

  /**
   * テストメール送信
   */
  async sendTestEmail(userEmail: string): Promise<boolean> {
    const subject = 'XYMPay - メール通知テスト'
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">メール通知テスト</h1>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <p>XYMPayのメール通知機能が正常に動作しています。</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">通知設定</h3>
            <p>✅ メール通知が有効になっています</p>
            <p>✅ SMTP設定が正常に動作しています</p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            これはテストメールです。今後、決済完了時などに通知メールが送信されます。
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2024 XYMPay. All rights reserved.</p>
        </div>
      </div>
    `

    const text = `
XYMPay - メール通知テスト

メール通知機能が正常に動作しています。

✅ メール通知が有効になっています
✅ SMTP設定が正常に動作しています

これはテストメールです。今後、決済完了時などに通知メールが送信されます。
    `

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text,
    })
  }
}

// シングルトンインスタンス
export const emailService = new EmailService()

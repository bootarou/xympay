import QRCode from 'qrcode';
import { QRGeneratorPlugin, PaymentRequest, QRCodeOptions, WalletInfo } from './types';

/**
 * Symbol Mobile Wallet用プラグイン
 */
export class SymbolMobilePlugin implements QRGeneratorPlugin {
  id = 'symbol-mobile';
  name = 'Symbol Mobile Wallet';
  version = '1.0.0';
  description = 'Symbol公式モバイルウォレット対応のQRコード生成';

  wallet: WalletInfo = {
    id: 'symbol-mobile',
    name: 'Symbol Mobile Wallet',
    displayName: 'Symbol Mobile',
    description: 'iOS/Android向けSymbol公式ウォレット',
    icon: '/icons/wallets/symbol-mobile.svg',
    type: 'mobile',
    supported: true,
    downloadUrl: 'https://symbolplatform.com/wallets',
    deepLinkScheme: 'symbol'
  };

  canHandle(request: PaymentRequest): boolean {
    // Symbol Mobileは基本的にすべてのSymbol決済に対応
    return true;
  }

  generateUri(request: PaymentRequest): string {
    const params = new URLSearchParams({
      recipient: request.recipientAddress,
      amount: request.amount.toString(),
      message: request.paymentId
    });

    if (request.currency) {
      params.set('currency', request.currency);
    }

    return `symbol://payment?${params.toString()}`;
  }

  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    const uri = this.generateUri(request);
    
    const qrOptions = {
      width: options?.width || 200,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF'
      }
    };

    try {
      if (options?.format === 'svg') {
        return await QRCode.toString(uri, { type: 'svg', ...qrOptions });
      } else {
        return await QRCode.toDataURL(uri, qrOptions);
      }
    } catch (error) {
      throw new Error(`Symbol Mobile QRコード生成エラー: ${error.message}`);
    }
  }
}

/**
 * Symbol Desktop Wallet用プラグイン
 */
export class SymbolDesktopPlugin implements QRGeneratorPlugin {
  id = 'symbol-desktop';
  name = 'Symbol Desktop Wallet';
  version = '1.0.0';
  description = 'Symbol公式デスクトップウォレット対応のQRコード生成';

  wallet: WalletInfo = {
    id: 'symbol-desktop',
    name: 'Symbol Desktop Wallet',
    displayName: 'Symbol Desktop',
    description: 'Windows/Mac/Linux向けSymbol公式ウォレット',
    icon: '/icons/wallets/symbol-desktop.svg',
    type: 'desktop',
    supported: true,
    downloadUrl: 'https://symbolplatform.com/wallets',
    deepLinkScheme: 'symbol'
  };

  canHandle(request: PaymentRequest): boolean {
    return true;
  }

  generateUri(request: PaymentRequest): string {
    // デスクトップ版も基本的にモバイルと同じURIスキーム
    const params = new URLSearchParams({
      recipient: request.recipientAddress,
      amount: request.amount.toString(),
      message: request.paymentId
    });

    if (request.currency) {
      params.set('currency', request.currency);
    }

    return `symbol://payment?${params.toString()}`;
  }

  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    const uri = this.generateUri(request);
    
    const qrOptions = {
      width: options?.width || 250,  // デスクトップは少し大きめ
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF'
      }
    };

    try {
      if (options?.format === 'svg') {
        return await QRCode.toString(uri, { type: 'svg', ...qrOptions });
      } else {
        return await QRCode.toDataURL(uri, qrOptions);
      }
    } catch (error) {
      throw new Error(`Symbol Desktop QRコード生成エラー: ${error.message}`);
    }
  }
}

/**
 * 汎用Symbol QRコード（従来互換）プラグイン
 */
export class SymbolStandardPlugin implements QRGeneratorPlugin {
  id = 'symbol-standard';
  name = 'Symbol Standard';
  version = '1.0.0';
  description = '標準的なSymbol決済QRコード（従来互換）';

  wallet: WalletInfo = {
    id: 'symbol-standard',
    name: 'Symbol Standard',
    displayName: 'Standard QR',
    description: '汎用的なSymbol決済QRコード',
    icon: '/icons/wallets/symbol-standard.svg',
    type: 'web',
    supported: true
  };

  canHandle(request: PaymentRequest): boolean {
    return true;
  }

  generateUri(request: PaymentRequest): string {
    // 最もシンプルな形式
    return `symbol://payment?recipient=${request.recipientAddress}&amount=${request.amount}&message=${request.paymentId}`;
  }

  async generateQR(request: PaymentRequest, options?: QRCodeOptions): Promise<string> {
    const uri = this.generateUri(request);
    
    const qrOptions = {
      width: options?.width || 200,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF'
      }
    };

    try {
      if (options?.format === 'svg') {
        return await QRCode.toString(uri, { type: 'svg', ...qrOptions });
      } else {
        return await QRCode.toDataURL(uri, qrOptions);
      }
    } catch (error) {
      throw new Error(`Symbol Standard QRコード生成エラー: ${error.message}`);
    }
  }
}

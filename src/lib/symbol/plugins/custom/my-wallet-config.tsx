import React, { useState, useEffect } from 'react';

interface MyWalletConfigProps {
  settings: MyWalletSettings;
  onSettingsChange: (settings: MyWalletSettings) => void;
}

interface MyWalletSettings {
  qrSize?: number;
  qrColor?: string;
  backgroundColor?: string;
  enableNotifications?: boolean;
  customScheme?: string;
  debugMode?: boolean;
}

/**
 * My Custom Wallet プラグインの設定コンポーネント
 */
export function MyWalletConfig({ settings, onSettingsChange }: MyWalletConfigProps) {
  const [localSettings, setLocalSettings] = useState<MyWalletSettings>({
    qrSize: 256,
    qrColor: '#2E7D32',
    backgroundColor: '#FFFFFF',
    enableNotifications: true,
    customScheme: 'mywallet://',
    debugMode: false,
    ...settings
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings({
      qrSize: 256,
      qrColor: '#2E7D32',
      backgroundColor: '#FFFFFF',
      enableNotifications: true,
      customScheme: 'mywallet://',
      debugMode: false,
      ...settings
    });
  }, [settings]);

  const handleChange = (key: keyof MyWalletSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    const defaultSettings: MyWalletSettings = {
      qrSize: 256,
      qrColor: '#2E7D32',
      backgroundColor: '#FFFFFF',
      enableNotifications: true,
      customScheme: 'mywallet://',
      debugMode: false
    };
    setLocalSettings(defaultSettings);
    setHasChanges(true);
  };

  const handleTest = async () => {
    try {
      // テスト用のQRコード生成
      const testUri = `${localSettings.customScheme}pay?recipient=TCQNZRRMHBHMHPXJ7HYM6WNBVCJD4Y2E636KJTY&amount=1000000&paymentId=TEST123`;
      
      // QRコードテストの結果を表示
      alert(`テスト成功！\nURI: ${testUri}\nQRサイズ: ${localSettings.qrSize}px`);
    } catch (error) {
      alert(`テスト失敗: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900">My Custom Wallet 設定</h3>
        <p className="mt-1 text-sm text-gray-500">
          カスタムウォレットプラグインの動作をカスタマイズできます
        </p>
      </div>

      {/* QRコード設定 */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-800">QRコード設定</h4>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              QRコードサイズ (px)
            </label>
            <input
              type="range"
              min="128"
              max="512"
              step="32"
              value={localSettings.qrSize}
              onChange={(e) => handleChange('qrSize', Number(e.target.value))}
              className="w-full"
            />
            <div className="text-sm text-gray-500 mt-1">
              現在の値: {localSettings.qrSize}px
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              QRコード色
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={localSettings.qrColor}
                onChange={(e) => handleChange('qrColor', e.target.value)}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={localSettings.qrColor}
                onChange={(e) => handleChange('qrColor', e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="#2E7D32"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            背景色
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={localSettings.backgroundColor}
              onChange={(e) => handleChange('backgroundColor', e.target.value)}
              className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={localSettings.backgroundColor}
              onChange={(e) => handleChange('backgroundColor', e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="#FFFFFF"
            />
          </div>
        </div>
      </div>

      {/* ウォレット設定 */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-800">ウォレット設定</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            カスタムスキーム
          </label>
          <input
            type="text"
            value={localSettings.customScheme}
            onChange={(e) => handleChange('customScheme', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="mywallet://"
          />
          <div className="text-sm text-gray-500 mt-1">
            ディープリンクで使用するURIスキーム
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center">
            <input
              id="notifications"
              type="checkbox"
              checked={localSettings.enableNotifications}
              onChange={(e) => handleChange('enableNotifications', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="notifications" className="ml-2 text-sm text-gray-700">
              通知を有効にする
            </label>
          </div>

          <div className="flex items-center">
            <input
              id="debug"
              type="checkbox"
              checked={localSettings.debugMode}
              onChange={(e) => handleChange('debugMode', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="debug" className="ml-2 text-sm text-gray-700">
              デバッグモードを有効にする
            </label>
          </div>
        </div>
      </div>

      {/* プレビュー */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-800">プレビュー</h4>
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="text-sm text-gray-600 space-y-1">
            <div>QRサイズ: {localSettings.qrSize}px</div>
            <div>QR色: <span className="inline-block w-4 h-4 rounded ml-1" style={{ backgroundColor: localSettings.qrColor }}></span> {localSettings.qrColor}</div>
            <div>背景色: <span className="inline-block w-4 h-4 rounded ml-1" style={{ backgroundColor: localSettings.backgroundColor }}></span> {localSettings.backgroundColor}</div>
            <div>スキーム: {localSettings.customScheme}</div>
            <div>通知: {localSettings.enableNotifications ? '有効' : '無効'}</div>
            <div>デバッグ: {localSettings.debugMode ? '有効' : '無効'}</div>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <div className="space-x-2">
          <button
            onClick={handleTest}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            設定をテスト
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100"
          >
            デフォルトに戻す
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            hasChanges
              ? 'text-white bg-blue-600 hover:bg-blue-700'
              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
          }`}
        >
          設定を保存
        </button>
      </div>

      {hasChanges && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
          ⚠️ 変更が保存されていません。「設定を保存」ボタンをクリックして変更を保存してください。
        </div>
      )}
    </div>
  );
}

export default MyWalletConfig;

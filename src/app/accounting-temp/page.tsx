'use client';

import { useState, useEffect } from 'react';

const ACCOUNTING_PROVIDERS = [
  { id: 'freee', name: 'freee' },
  { id: 'mf', name: 'マネーフォワード' },
  { id: 'yayoi', name: '弥生' },
  { id: 'csv', name: 'CSV/Excel出力' }
];

export default function TempAccountingPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    provider: '',
    isEnabled: true,
    autoSync: false,
    syncFrequency: 'daily',
    defaultTaxRate: 10.00,
    defaultAccountCode: '4110',
    exchangeRateSource: 'api',
  });
  const [showCreateForm, setShowCreateForm] = useState(false);

  // 設定を取得
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accounting/temp');
      const data = await response.json();
      
      if (response.ok) {
        setSettings(data.settings || []);
        setError(null);
      } else {
        setError(data.error || 'データの取得に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 設定を作成
  const createSettings = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/accounting/temp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('設定が作成されました！');
        setShowCreateForm(false);
        fetchSettings(); // 再取得
        setFormData({
          provider: '',
          isEnabled: true,
          autoSync: false,
          syncFrequency: 'daily',
          defaultTaxRate: 10.00,
          defaultAccountCode: '4110',
          exchangeRateSource: 'api',
        });
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch (err) {
      alert('作成に失敗しました');
      console.error('Create error:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">会計ソフト連携（テスト版）</h1>
                <p className="mt-1 text-gray-500">認証をスキップしたテスト版です</p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                新しい設定を追加
              </button>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-800">エラー: {error}</div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">現在の設定</h3>
              
              {settings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">設定がありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {settings.map((setting) => (
                    <div key={setting.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{setting.provider}</h4>
                          <p className="text-sm text-gray-500">
                            {setting.isEnabled ? '有効' : '無効'} • 
                            {setting.autoSync ? '自動同期' : '手動同期'}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          作成日: {new Date(setting.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">新しい会計設定を追加</h3>
              
              <form onSubmit={createSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">会計ソフト</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({...formData, provider: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">選択してください</option>
                    {ACCOUNTING_PROVIDERS.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.autoSync}
                    onChange={(e) => setFormData({...formData, autoSync: e.target.checked})}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">自動同期を有効にする</label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    作成
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

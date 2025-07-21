'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAccountingSettings, ACCOUNTING_PROVIDERS, SYNC_FREQUENCIES, ACCOUNT_CODES } from '../../hooks/useAccountingSettings';

interface SyncHistory {
  id: string;
  settingsId: string;
  syncType: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  successCount: number;
  errorCount: number;
  errorDetails?: string;
  settings: {
    provider: string;
    autoSync: boolean;
  };
}

export default function AccountingSettings() {
  const { data: session, status } = useSession();
  const { settings, loading, error, createSettings, updateSettings, deleteSettings, exportData } = useAccountingSettings();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showExportForm, setShowExportForm] = useState(false);
  const [showSyncHistory, setShowSyncHistory] = useState(false);
  const [syncHistories, setSyncHistories] = useState<SyncHistory[]>([]);
  const [syncHistoryLoading, setSyncHistoryLoading] = useState(false);
  const [formData, setFormData] = useState({
    provider: '',
    isEnabled: true,
    autoSync: false,
    syncFrequency: 'daily',
    defaultTaxRate: 10.00,
    defaultAccountCode: '4110',
    exchangeRateSource: 'api',
    minAmount: '',
    excludeStatuses: [] as string[]
  });

  const [exportForm, setExportForm] = useState({
    format: 'csv' as 'csv' | 'excel',
    dateFrom: '',
    dateTo: '',
    status: 'confirmed',
    settingsId: ''
  });

  const [actionLoading, setActionLoading] = useState(false);

  const handleCreateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    
    try {
      await createSettings({
        ...formData,
        minAmount: formData.minAmount ? parseFloat(formData.minAmount) : null
      });
      setShowCreateForm(false);
      setFormData({
        provider: '',
        isEnabled: true,
        autoSync: false,
        syncFrequency: 'daily',
        defaultTaxRate: 10.00,
        defaultAccountCode: '4110',
        exchangeRateSource: 'api',
        minAmount: '',
        excludeStatuses: []
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleEnabled = async (id: string, currentValue: boolean) => {
    setActionLoading(true);
    try {
      await updateSettings(id, { isEnabled: !currentValue });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSettings = async (id: string) => {
    if (!confirm('この設定を削除してもよろしいですか？')) return;
    
    setActionLoading(true);
    try {
      await deleteSettings(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    
    try {
      await exportData(exportForm);
      setShowExportForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setActionLoading(false);
    }
  };

  // OAuth認証開始
  const handleOAuthConnect = async (provider: string) => {
    try {
      if (provider === 'freee') {
        window.location.href = '/accounting/freee-oauth';
      } else {
        alert('このプロバイダーのOAuth認証はまだ実装されていません');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'OAuth認証エラーが発生しました');
    }
  };

  // 手動同期実行
  const handleManualSync = async (settingsId: string) => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/accounting/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settingsId,
          dateFrom: exportForm.dateFrom,
          dateTo: exportForm.dateTo,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('同期処理を開始しました。履歴から進捗を確認できます。');
        fetchSyncHistory(); // 履歴を更新
      } else {
        throw new Error(data.error || '同期の開始に失敗しました');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '同期エラーが発生しました');
    } finally {
      setActionLoading(false);
    }
  };

  // 同期履歴取得
  const fetchSyncHistory = async () => {
    try {
      setSyncHistoryLoading(true);
      const response = await fetch('/api/accounting/sync');
      const data = await response.json();
      
      if (response.ok) {
        setSyncHistories(data.histories || []);
      } else {
        throw new Error(data.error || '同期履歴の取得に失敗しました');
      }
    } catch (err) {
      console.error('Sync history fetch error:', err);
    } finally {
      setSyncHistoryLoading(false);
    }
  };

  // 同期履歴を初回ロード
  useEffect(() => {
    if (showSyncHistory) {
      fetchSyncHistory();
    }
  }, [showSyncHistory]);

  // URL パラメータからOAuth結果を確認
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success === 'oauth_connected') {
      alert('OAuth認証が完了しました！');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (success === 'freee_company_selected') {
      alert('freee会社の選択が完了しました！');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      alert(`エラー: ${decodeURIComponent(error)}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const getProviderName = (providerId: string) => {
    return ACCOUNTING_PROVIDERS.find(p => p.id === providerId)?.name || providerId;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              会計ソフト連携設定
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              取引履歴を会計ソフトに同期して、経理処理を自動化できます
            </p>
          </div>
          <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
            <button
              onClick={() => setShowExportForm(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              データエクスポート
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新しい設定を追加
            </button>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 設定一覧 */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">現在の設定</h3>
          
          {settings.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">設定がありません</h3>
              <p className="mt-1 text-sm text-gray-500">会計ソフトとの連携設定を追加してください。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {settings.map((setting) => (
                <div key={setting.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${setting.isEnabled ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{getProviderName(setting.provider)}</h4>
                        <p className="text-sm text-gray-500">
                          {setting.autoSync ? `自動同期: ${setting.syncFrequency}` : '手動同期のみ'}
                          {setting.lastSyncAt && ` • 最終同期: ${new Date(setting.lastSyncAt).toLocaleDateString()}`}
                        </p>
                        {/* OAuth認証状態の表示 */}
                        {setting.provider === 'freee' && (
                          <div className="flex items-center mt-1 text-xs">
                            {setting.authTokens ? (
                              <>
                                <span className="text-green-600">● OAuth認証済み</span>
                                {setting.companyId && (
                                  <span className="text-gray-500 ml-2">会社ID: {setting.companyId}</span>
                                )}
                              </>
                            ) : (
                              <span className="text-red-600">● OAuth認証が必要</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* OAuth認証ボタン（freeeの場合のみ） */}
                      {setting.provider === 'freee' && (
                        <button
                          onClick={() => handleOAuthConnect('freee')}
                          disabled={actionLoading}
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            setting.authTokens 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          }`}
                        >
                          {setting.authTokens ? 'OAuth再認証' : 'OAuth認証'}
                        </button>
                      )}
                      
                      {/* 手動同期ボタン */}
                      <button
                        onClick={() => handleManualSync(setting.id)}
                        disabled={actionLoading || !setting.isEnabled}
                        className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full hover:bg-indigo-200 disabled:opacity-50"
                      >
                        手動同期
                      </button>
                      
                      <button
                        onClick={() => handleToggleEnabled(setting.id, setting.isEnabled)}
                        disabled={actionLoading}
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          setting.isEnabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {setting.isEnabled ? '有効' : '無効'}
                      </button>
                      <button
                        onClick={() => handleDeleteSettings(setting.id)}
                        disabled={actionLoading}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 新規設定作成フォーム */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">新しい会計設定を追加</h3>
            
            <form onSubmit={handleCreateSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">会計ソフト</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({...formData, provider: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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

              <div>
                <label className="block text-sm font-medium text-gray-700">税率 (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.defaultTaxRate}
                  onChange={(e) => setFormData({...formData, defaultTaxRate: parseFloat(e.target.value)})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">勘定科目</label>
                <select
                  value={formData.defaultAccountCode}
                  onChange={(e) => setFormData({...formData, defaultAccountCode: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {ACCOUNT_CODES.map(account => (
                    <option key={account.code} value={account.code}>
                      {account.code} - {account.name}
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

              {formData.autoSync && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">同期頻度</label>
                  <select
                    value={formData.syncFrequency}
                    onChange={(e) => setFormData({...formData, syncFrequency: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    {SYNC_FREQUENCIES.map(freq => (
                      <option key={freq.id} value={freq.id}>
                        {freq.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  disabled={actionLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* データエクスポートフォーム */}
      {showExportForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">会計データをエクスポート</h3>
            
            <form onSubmit={handleExport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">フォーマット</label>
                <select
                  value={exportForm.format}
                  onChange={(e) => setExportForm({...exportForm, format: e.target.value as 'csv' | 'excel'})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">開始日</label>
                <input
                  type="date"
                  value={exportForm.dateFrom}
                  onChange={(e) => setExportForm({...exportForm, dateFrom: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">終了日</label>
                <input
                  type="date"
                  value={exportForm.dateTo}
                  onChange={(e) => setExportForm({...exportForm, dateTo: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">ステータス</label>
                <select
                  value={exportForm.status}
                  onChange={(e) => setExportForm({...exportForm, status: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="all">すべて</option>
                  <option value="confirmed">確認済み</option>
                  <option value="pending">処理中</option>
                  <option value="expired">期限切れ</option>
                </select>
              </div>

              {settings.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">設定を参照（税率・勘定科目）</label>
                  <select
                    value={exportForm.settingsId}
                    onChange={(e) => setExportForm({...exportForm, settingsId: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">デフォルト設定を使用</option>
                    {settings.map(setting => (
                      <option key={setting.id} value={setting.id}>
                        {getProviderName(setting.provider)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExportForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading ? 'エクスポート中...' : 'エクスポート'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 同期履歴 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">同期履歴</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSyncHistory(!showSyncHistory)}
                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
              >
                {showSyncHistory ? '履歴を非表示' : '履歴を表示'}
              </button>
              {showSyncHistory && (
                <button
                  onClick={fetchSyncHistory}
                  disabled={syncHistoryLoading}
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  {syncHistoryLoading ? '更新中...' : '更新'}
                </button>
              )}
            </div>
          </div>

          {showSyncHistory && (
            <div className="space-y-3">
              {syncHistoryLoading ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
                </div>
              ) : syncHistories.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">同期履歴がありません</p>
                </div>
              ) : (
                syncHistories.map((history) => (
                  <div key={history.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          history.status === 'completed' ? 'bg-green-400' :
                          history.status === 'completed_with_errors' ? 'bg-yellow-400' :
                          history.status === 'failed' ? 'bg-red-400' :
                          'bg-blue-400'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {getProviderName(history.settings.provider)} • {history.syncType === 'manual' ? '手動同期' : '自動同期'}
                          </p>
                          <p className="text-xs text-gray-500">
                            開始: {new Date(history.startedAt).toLocaleString()}
                            {history.completedAt && ` • 完了: ${new Date(history.completedAt).toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          成功: {history.successCount} / エラー: {history.errorCount}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{history.status}</p>
                      </div>
                    </div>
                    {history.errorDetails && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                        <details>
                          <summary className="cursor-pointer">エラー詳細を表示</summary>
                          <pre className="mt-1 whitespace-pre-wrap">{history.errorDetails}</pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* デバッグ: セッション情報 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">セッション情報（デバッグ）</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>ステータス: {status}</p>
                <p>ユーザーID: {session?.user?.id || 'なし'}</p>
                <p>メール: {session?.user?.email || 'なし'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

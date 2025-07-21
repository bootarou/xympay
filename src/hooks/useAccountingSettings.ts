import { useState, useEffect } from 'react';

interface AccountingSyncSettings {
  id: string;
  provider: string;
  isEnabled: boolean;
  autoSync: boolean;
  syncFrequency: string;
  lastSyncAt: Date | null;
  defaultTaxRate: number;
  defaultAccountCode: string;
  exchangeRateSource: string;
  minAmount: number | null;
  excludeStatuses: string[];
  authTokens: string | null;
  companyId: string | null;
  lastAuthAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ExportParams {
  format: 'csv' | 'excel';
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  settingsId?: string;
}

export const useAccountingSettings = () => {
  const [settings, setSettings] = useState<AccountingSyncSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/accounting/settings');
      if (!response.ok) {
        throw new Error('設定の取得に失敗しました');
      }
      
      const data = await response.json();
      setSettings(data.settings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const createSettings = async (newSettings: Partial<AccountingSyncSettings>) => {
    try {
      const response = await fetch('/api/accounting/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '設定の作成に失敗しました');
      }

      const data = await response.json();
      setSettings(prev => [...prev, data.settings]);
      return data.settings;
    } catch (err) {
      throw err;
    }
  };

  const updateSettings = async (id: string, updates: Partial<AccountingSyncSettings>) => {
    try {
      const response = await fetch(`/api/accounting/settings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '設定の更新に失敗しました');
      }

      const data = await response.json();
      setSettings(prev => 
        prev.map(setting => 
          setting.id === id ? data.settings : setting
        )
      );
      return data.settings;
    } catch (err) {
      throw err;
    }
  };

  const deleteSettings = async (id: string) => {
    try {
      const response = await fetch(`/api/accounting/settings/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '設定の削除に失敗しました');
      }

      setSettings(prev => prev.filter(setting => setting.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const exportData = async (params: ExportParams) => {
    try {
      const response = await fetch('/api/accounting/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'エクスポートに失敗しました');
      }

      // ファイルダウンロード
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
        `xympay-export-${new Date().toISOString().split('T')[0]}.${params.format}`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    createSettings,
    updateSettings,
    deleteSettings,
    exportData
  };
};

// プロバイダー選択肢
export const ACCOUNTING_PROVIDERS = [
  { id: 'csv', name: 'CSV/Excel', description: '汎用的なファイル形式でエクスポート' },
  { id: 'freee', name: 'freee', description: '国内シェアNo.1の会計ソフト' },
  { id: 'mf', name: 'マネーフォワード', description: '中小企業に人気の会計ソフト' },
  { id: 'yayoi', name: '弥生会計', description: '老舗で信頼性の高い会計ソフト' }
];

// 同期頻度の選択肢
export const SYNC_FREQUENCIES = [
  { id: 'realtime', name: 'リアルタイム', description: '取引確定時に即座に同期' },
  { id: 'daily', name: '日次', description: '毎日決まった時間に同期' },
  { id: 'weekly', name: '週次', description: '毎週決まった曜日に同期' },
  { id: 'monthly', name: '月次', description: '毎月決まった日に同期' }
];

// 勘定科目の選択肢（一般的なもの）
export const ACCOUNT_CODES = [
  { code: '4110', name: '売上高', description: '一般的な売上' },
  { code: '4120', name: '売上高（サービス）', description: 'サービス売上' },
  { code: '4130', name: '売上高（デジタル商品）', description: 'デジタル商品売上' },
  { code: '4140', name: '売上高（その他）', description: 'その他の売上' }
];

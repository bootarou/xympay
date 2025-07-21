'use client';

import { useState, useEffect } from 'react';

interface SyncProgress {
  syncHistoryId: string;
  status: 'running' | 'completed' | 'failed' | 'partial';
  successCount: number;
  errorCount: number;
  totalCount: number;
  startedAt: string;
  completedAt?: string;
}

interface SyncProgressMonitorProps {
  syncHistoryId: string | null;
  onComplete?: (result: SyncProgress) => void;
}

export default function SyncProgressMonitor({ syncHistoryId, onComplete }: SyncProgressMonitorProps) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!syncHistoryId) return;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/accounting/sync/${syncHistoryId}`);
        if (response.ok) {
          const data = await response.json();
          setProgress(data);
          
          // 完了したらコールバックを呼び出し
          if (data.status !== 'running' && onComplete) {
            onComplete(data);
          }
        }
      } catch (error) {
        console.error('Progress fetch error:', error);
      }
    };

    setLoading(true);
    fetchProgress();

    // ポーリング（実行中の場合のみ）
    const interval = setInterval(() => {
      if (progress?.status === 'running') {
        fetchProgress();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [syncHistoryId, progress?.status, onComplete]);

  if (!syncHistoryId || !progress) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'partial': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return '実行中';
      case 'completed': return '完了';
      case 'failed': return '失敗';
      case 'partial': return '部分的成功';
      default: return '不明';
    }
  };

  const progressPercentage = progress.totalCount > 0 
    ? Math.round(((progress.successCount + progress.errorCount) / progress.totalCount) * 100)
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-medium text-gray-900">同期進捗状況</h4>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(progress.status)}`}>
          {getStatusText(progress.status)}
        </span>
      </div>

      {/* プログレスバー */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>進捗</span>
          <span>{progress.successCount + progress.errorCount} / {progress.totalCount}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              progress.status === 'running' ? 'bg-blue-500' : 
              progress.status === 'completed' ? 'bg-green-500' :
              progress.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {progressPercentage}% 完了
        </div>
      </div>

      {/* 詳細統計 */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{progress.successCount}</div>
          <div className="text-gray-500">成功</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{progress.errorCount}</div>
          <div className="text-gray-500">エラー</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600">{progress.totalCount}</div>
          <div className="text-gray-500">合計</div>
        </div>
      </div>

      {/* 実行時間 */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        開始時刻: {new Date(progress.startedAt).toLocaleString()}
        {progress.completedAt && (
          <span className="ml-4">
            完了時刻: {new Date(progress.completedAt).toLocaleString()}
          </span>
        )}
      </div>

      {/* 実行中のローディングアニメーション */}
      {progress.status === 'running' && (
        <div className="mt-3 flex items-center text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          同期処理を実行中...
        </div>
      )}
    </div>
  );
}

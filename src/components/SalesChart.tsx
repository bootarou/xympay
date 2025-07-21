'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TooltipItem,
} from 'chart.js';

// Chart.jsコンポーネントを動的にインポート（SSR無効化）
const Line = dynamic(
  () => import('react-chartjs-2').then((mod) => mod.Line),
  {
    ssr: false,
    loading: () => (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    ),
  }
);

// Chart.jsの登録をuseEffect内で行う
if (typeof window !== 'undefined') {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  );
}

interface SalesChartProps {
  className?: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
  }[];
}

type Period = 'daily' | 'monthly' | 'yearly';

export default function SalesChart({ className = '' }: SalesChartProps) {
  const [period, setPeriod] = useState<Period>('daily');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // クライアントサイドでのマウント状態を管理
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/dashboard/chart?period=${period}`);
      
      if (!response.ok) {
        throw new Error('グラフデータの取得に失敗しました');
      }
      
      const data = await response.json();
      setChartData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'line'>) {
            const value = context.parsed.y;
            if (value >= 1) {
              return `${context.dataset.label}: ${value.toFixed(2)} XYM`;
            } else {
              return `${context.dataset.label}: ${(value * 1000000).toLocaleString()} μXYM`;
            }
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '売上 (XYM)'
        },
        ticks: {
          callback: function(value: string | number) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            if (numValue >= 1) {
              return `${numValue} XYM`;
            } else {
              return `${(numValue * 1000000).toLocaleString()} μXYM`;
            }
          }
        }
      },
      x: {
        title: {
          display: true,
          text: period === 'daily' ? '日付' : period === 'monthly' ? '月' : '年'
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const getPeriodLabel = (period: Period) => {
    switch (period) {
      case 'daily': return '日別';
      case 'monthly': return '月別';
      case 'yearly': return '年別';
      default: return '';
    }
  };

  // SSRを回避するため、マウントされるまで何も表示しない
  if (!mounted) {
    return (
      <div className={`bg-white rounded-lg shadow-md ${className}`}>
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">売上推移</h3>
          <div className="flex space-x-2">
            {(['daily', 'monthly', 'yearly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getPeriodLabel(p)}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-red-500 text-sm mb-2">{error}</p>
              <button
                onClick={fetchChartData}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                再読み込み
              </button>
            </div>
          </div>
        ) : chartData ? (
          <div className="h-64">
            <Line options={options} data={chartData} />
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">データがありません</p>
          </div>
        )}
      </div>
    </div>
  );
}

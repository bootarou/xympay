import { useState, useEffect } from 'react';

interface DashboardStats {
  productCount: number;
  monthlyRevenue: number;
  monthlyTransactions: number;
  totalTransactions: number;
}

interface UseDashboardStatsReturn {
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useDashboardStats = (): UseDashboardStatsReturn => {
  const [stats, setStats] = useState<DashboardStats>({
    productCount: 0,
    monthlyRevenue: 0,
    monthlyTransactions: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard/stats');
      
      if (!response.ok) {
        throw new Error('統計情報の取得に失敗しました');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '統計情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchStats();
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refetch };
};

// 金額フォーマット関数（μXYMからXYMに変換）
export const formatAmount = (amount: number): string => {
  const xymAmount = amount / 1_000_000;
  
  // 金額に応じて小数点桁数を調整
  let maximumFractionDigits = 6;
  if (xymAmount >= 1) {
    maximumFractionDigits = 2;
  } else if (xymAmount >= 0.01) {
    maximumFractionDigits = 4;
  } else {
    maximumFractionDigits = 6;
  }
  
  return new Intl.NumberFormat("ja-JP", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(xymAmount);
};

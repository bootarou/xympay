import { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  paymentId: string;
  productName: string;
  amount: number;
  status: string;
  confirmedAt: string | null;
  createdAt: string;
  baseCurrencyAmount: number | null;
  baseCurrency: string | null;
}

interface DashboardDetails {
  totalSales: number;
  totalBaseCurrencySales: number;
  totalTransactions: number;
  pendingPayments: number;
  errorCount: number;
  recentTransactions: Transaction[];
}

export function useDashboardDetails() {
  const [data, setData] = useState<DashboardDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/dashboard/details');
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard details');
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardDetails();
  }, []);

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString();
  };

  const formatAmountToXYM = (amount: number): string => {
    const xym = amount / 1000000;
    
    // 金額に応じて小数点桁数を調整
    let maximumFractionDigits = 6;
    if (xym >= 1) {
      maximumFractionDigits = 2;
    } else if (xym >= 0.01) {
      maximumFractionDigits = 4;
    } else {
      maximumFractionDigits = 6;
    }
    
    return new Intl.NumberFormat("ja-JP", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }).format(xym);
  };

  const formatBaseCurrency = (amount: number | null, currency: string | null): string => {
    if (amount === null || currency === null) return '';
    
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatBaseCurrencyValue = (amount: number, currency: string = 'JPY'): string => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return {
    data,
    loading,
    error,
    formatAmount,
    formatAmountToXYM,
    formatBaseCurrency,
    formatBaseCurrencyValue,
    formatDate,
    formatDateTime,
    refetch: () => {
      setData(null);
      setLoading(true);
      setError(null);
    }
  };
}

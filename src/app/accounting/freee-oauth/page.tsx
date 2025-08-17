'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface FreeeCompany {
  id: number;
  name: string;
  display_name: string;
  role: string;
}

export default function FreeeOAuthPage() {
  const { data: session, status } = useSession();
  const [companies, setCompanies] = useState<FreeeCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // OAuth認証開始
  const startOAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/accounting/oauth/start?provider=freee');
      const data = await response.json();
      
      if (response.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else if (response.status === 400 && data.redirectTo) {
        // freee設定が未完了の場合
        if (confirm(`${data.message}\n設定ページに移動しますか？`)) {
          window.location.href = data.redirectTo;
        }
      } else {
        throw new Error(data.error || 'OAuth認証の開始に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth認証エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 会社一覧を取得
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/accounting/freee/companies');
      const data = await response.json();
      
      if (response.ok) {
        setCompanies(data.companies || []);
        setIsAuthenticated(true);
      } else {
        throw new Error(data.error || '会社一覧の取得に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '会社情報の取得エラー');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // URL パラメータからOAuth結果を確認
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success === 'oauth_connected') {
      setError(null);
      // OAuth成功後、会社一覧を取得
      fetchCompanies();
      // URLパラメータをクリア
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      setError(`OAuth認証エラー: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 会社選択処理
  const selectCompany = async (companyId: number) => {
    try {
      setLoading(true);
      
      // 選択した会社IDを設定に保存
      const response = await fetch('/api/accounting/freee/select-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId }),
      });
      
      if (response.ok) {
        // 会計設定ページに戻る
        window.location.href = '/accounting?success=freee_company_selected';
      } else {
        const data = await response.json();
        throw new Error(data.error || '会社選択に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '会社選択エラー');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ログインが必要です</h1>
          <Link href="/auth/signin" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            ログインページへ
          </Link>
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
                <h1 className="text-2xl font-bold text-gray-900">freee OAuth 連携</h1>
                <p className="mt-1 text-gray-500">freee会計との連携設定</p>
              </div>
              <Link href="/accounting" className="text-indigo-600 hover:text-indigo-900">
                ← 会計設定に戻る
              </Link>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-800">エラー: {error}</div>
              </div>
            )}

            {!isAuthenticated ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">freee OAuth認証</h3>
                <p className="text-gray-500 mb-6">freee会計にアクセスするための認証を行います</p>
                <button
                  onClick={startOAuth}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? '認証中...' : 'freee OAuth認証を開始'}
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">認証済み - 利用可能な会社</h3>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">会社情報を取得中...</p>
                  </div>
                ) : companies.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">利用可能な会社が見つかりません</p>
                    <button
                      onClick={fetchCompanies}
                      className="mt-4 text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      再取得
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {companies.map((company) => (
                      <div key={company.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900">{company.display_name}</h4>
                        <p className="text-sm text-gray-500">{company.name}</p>
                        <p className="text-xs text-gray-400 mt-1">権限: {company.role}</p>
                        <button
                          onClick={() => selectCompany(company.id)}
                          disabled={loading}
                          className="mt-2 text-indigo-600 hover:text-indigo-900 text-sm font-medium disabled:opacity-50"
                        >
                          この会社で設定
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setIsAuthenticated(false);
                      setCompanies([]);
                      startOAuth();
                    }}
                    className="text-red-600 hover:text-red-900 text-sm font-medium"
                  >
                    OAuth認証をやり直す
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

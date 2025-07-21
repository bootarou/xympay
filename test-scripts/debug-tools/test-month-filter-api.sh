#!/bin/bash

# 今月フィルターAPI直接テスト

echo "🔍 今月フィルターAPI動作確認"
echo ""

# 現在の日付情報
echo "=== 現在の日付情報 ==="
echo "現在日時: $(date)"
echo ""

# APIテスト用のURL
API_BASE="http://localhost:3000"

echo "=== 取引履歴API テスト ==="
echo ""

# 期間フィルターなし（全データ）
echo "📊 全データ取得:"
curl -s "${API_BASE}/api/transactions?page=1&limit=5" | \
  jq -r '.transactions[] | "ID: \(.paymentId) | 作成日: \(.createdAt) | 商品: \(.product.name)"' | head -10

echo ""

# 今月フィルター適用
echo "📊 今月フィルター適用:"
curl -s "${API_BASE}/api/transactions?page=1&limit=10&period=month" | \
  jq -r '.transactions[] | "ID: \(.paymentId) | 作成日: \(.createdAt) | 商品: \(.product.name)"'

echo ""

# 統計API確認
echo "=== 統計API テスト ==="
echo ""

echo "📊 今月統計:"
curl -s "${API_BASE}/api/transactions/stats?period=month" | jq '.'

echo ""

echo "=== 修正確認項目 ==="
echo "1. 取引履歴APIで今月以外のデータが含まれているか"
echo "2. 統計APIの期間計算が正しいか"
echo "3. フロントエンドで正しいAPIパラメータが送信されているか"

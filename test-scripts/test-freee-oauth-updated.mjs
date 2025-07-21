#!/usr/bin/env node
// Node.js 18+ の組み込みfetchを使用

// テスト用のダミー環境変数
process.env.FREEE_CLIENT_ID = 'test_client_id';
process.env.FREEE_CLIENT_SECRET = 'test_client_secret';
process.env.FREEE_REDIRECT_URI = 'http://localhost:3000/api/accounting/oauth/callback';

const BASE_URL = 'http://localhost:3000';

async function testFreeeOAuthFlow() {
  console.log('🔧 freee OAuth フローのテスト開始\n');

  try {
    // 1. OAuth開始URLを取得（認証なし - 失敗することを確認）
    console.log('1. OAuth認証開始URLを取得中（認証なしテスト）...');
    const startResponse = await fetch(`${BASE_URL}/api/accounting/oauth/start?provider=freee`);
    
    console.log('レスポンス status:', startResponse.status);
    console.log('レスポンス headers:', [...startResponse.headers.entries()]);
    
    const startText = await startResponse.text();
    console.log('レスポンス body (first 200 chars):', startText.substring(0, 200));
    
    if (startResponse.status === 401) {
      console.log('✅ OAuth開始URL取得 - 認証なしで正しく401エラー');
    } else if (startResponse.status === 404) {
      console.log('⚠️ 404エラー - APIエンドポイントが見つからない');
    } else {
      console.log('⚠️ 予期しないレスポンス status:', startResponse.status);
    }
    console.log('');

    // 2. 会社一覧の取得をテスト（認証なしでエラーになることを確認）
    console.log('2. 認証なしで会社一覧取得をテスト...');
    const companiesResponse = await fetch(`${BASE_URL}/api/accounting/freee/companies`);
    const companiesData = await companiesResponse.json();
    
    if (companiesResponse.status === 401) {
      console.log('✅ 認証なしでは正しく401エラーが返される');
    } else {
      console.log('⚠️ 予期しないレスポンス:', companiesData);
    }
    console.log('');

    // 3. テスト用エンドポイントで基本動作を確認
    console.log('3. テスト用エンドポイントで基本動作を確認...');
    const testResponse = await fetch(`${BASE_URL}/api/accounting/test`);
    const testData = await testResponse.json();
    
    if (testResponse.ok) {
      console.log('✅ テストエンドポイント正常動作');
      console.log('レスポンス:', JSON.stringify(testData, null, 2));
    } else {
      console.log('⚠️ テストエンドポイントエラー:', testData.error);
    }
    console.log('');

    // 4. Debug エンドポイントでDB接続確認
    console.log('4. Debug エンドポイントでDB接続確認...');
    const debugResponse = await fetch(`${BASE_URL}/api/accounting/debug`);
    const debugData = await debugResponse.json();
    
    if (debugResponse.ok) {
      console.log('✅ Debug エンドポイント正常動作');
      console.log('設定数:', debugData.settings?.length || 0);
    } else {
      console.log('⚠️ Debug エンドポイントエラー:', debugData.error);
    }
    console.log('');

    console.log('📋 手動テスト手順:');
    console.log('1. ブラウザで http://localhost:3000/auth/signin にアクセスしてログイン');
    console.log('2. http://localhost:3000/accounting にアクセス');
    console.log('3. "新しい設定を追加" でfreeeを選択');
    console.log('4. 作成後、"OAuth認証" ボタンをクリック');
    console.log('5. http://localhost:3000/accounting/freee-oauth で手動テスト');
    console.log('');
    console.log('⚠️ 実際のOAuth テストには有効なfreee認証情報が必要です');

  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
  }
}

// 環境変数チェック
async function checkEnvironment() {
  console.log('🔍 環境変数チェック\n');
  
  const requiredEnvs = [
    'FREEE_CLIENT_ID',
    'FREEE_CLIENT_SECRET', 
    'FREEE_REDIRECT_URI'
  ];
  
  for (const env of requiredEnvs) {
    const value = process.env[env];
    if (value) {
      console.log(`✅ ${env}: 設定済み (${value.includes('test') ? value : value.substring(0, 10) + '...'})`);
    } else {
      console.log(`❌ ${env}: 未設定`);
    }
  }
  console.log('');
}

// メイン実行
async function main() {
  console.log('='.repeat(50));
  console.log('     freee OAuth フロー テスト');
  console.log('='.repeat(50));
  console.log('');

  await checkEnvironment();
  await testFreeeOAuthFlow();

  console.log('');
  console.log('='.repeat(50));
  console.log('テスト完了');
  console.log('='.repeat(50));
}

main().catch(console.error);

#!/usr/bin/env node
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testFreeeOAuthFlow() {
  console.log('🔧 freee OAuth フローのテスト開始\n');

  try {
    // 1. OAuth開始URLを取得
    console.log('1. OAuth認証開始URLを取得中...');
    const startResponse = await fetch(`${BASE_URL}/api/accounting/oauth/start?provider=freee`);
    const startData = await startResponse.json();
    
    if (!startResponse.ok) {
      console.error('❌ OAuth開始URLの取得に失敗:', startData.error);
      return;
    }
    
    console.log('✅ OAuth開始URL取得成功');
    console.log('認証URL:', startData.authUrl);
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

    // 3. 設定確認
    console.log('3. 現在の設定状況を確認...');
    const settingsResponse = await fetch(`${BASE_URL}/api/accounting/debug`);
    const settingsData = await settingsResponse.json();
    
    if (settingsResponse.ok) {
      console.log('✅ 設定確認成功');
      console.log('設定数:', settingsData.settings?.length || 0);
      console.log('freee設定:', settingsData.settings?.filter(s => s.provider === 'freee').length || 0);
    } else {
      console.log('⚠️ 設定確認エラー:', settingsData.error);
    }
    console.log('');

    console.log('📋 手動テスト手順:');
    console.log('1. ブラウザで http://localhost:3000/accounting にアクセス');
    console.log('2. "新しい設定を追加" でfreeeを選択');
    console.log('3. 作成後、"OAuth認証" ボタンをクリック');
    console.log('4. freee OAuth認証を完了');
    console.log('5. http://localhost:3000/accounting/freee-oauth で会社選択');
    console.log('6. 会社選択後、設定画面に戻って状態を確認');

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
      console.log(`✅ ${env}: 設定済み (${value.substring(0, 10)}...)`);
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

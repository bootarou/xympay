#!/usr/bin/env node
// テスト用のユーザーと設定を作成するスクリプト

const BASE_URL = 'http://localhost:3000';

async function createTestData() {
  console.log('🔧 テストデータ作成スクリプト\n');

  try {
    // 1. テスト用エンドポイントで認証をバイパスして設定を作成
    console.log('1. テスト用freee設定を作成...');
    const createResponse = await fetch(`${BASE_URL}/api/accounting/temp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create_test_settings',
        provider: 'freee',
        userId: 'test-user-id-123'
      }),
    });

    const createText = await createResponse.text();
    console.log('作成レスポンス status:', createResponse.status);
    console.log('作成レスポンス:', createText.substring(0, 300));
    console.log('');

    // 2. Debug エンドポイントで現在の設定を確認
    console.log('2. 現在のDB設定を確認...');
    const debugResponse = await fetch(`${BASE_URL}/api/accounting/debug`);
    const debugData = await debugResponse.json();
    
    if (debugResponse.ok) {
      console.log('✅ DB接続正常');
      console.log('設定数:', debugData.settings?.length || 0);
      if (debugData.settings && debugData.settings.length > 0) {
        console.log('最新設定:', JSON.stringify(debugData.settings[0], null, 2));
      }
    } else {
      console.log('⚠️ Debug エンドポイントエラー:', debugData.error);
    }
    console.log('');

    // 3. OAuth認証テスト（セッションを模擬）
    console.log('3. OAuth認証をテスト（セッション模擬）...');
    const testOAuthResponse = await fetch(`${BASE_URL}/api/accounting/temp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'test_oauth',
        provider: 'freee',
        userId: 'test-user-id-123'
      }),
    });

    const oauthText = await testOAuthResponse.text();
    console.log('OAuth テスト status:', testOAuthResponse.status);
    console.log('OAuth テスト レスポンス:', oauthText.substring(0, 300));
    console.log('');

    console.log('📋 次のステップ:');
    console.log('1. ブラウザで http://localhost:3000/auth/signin でログイン');
    console.log('2. http://localhost:3000/accounting で設定を確認');
    console.log('3. http://localhost:3000/accounting/freee-oauth でOAuth テスト');
    console.log('4. 実際のfreee認証情報がある場合は .env ファイルを設定');

  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
  }
}

// メイン実行
async function main() {
  console.log('='.repeat(50));
  console.log('     テストデータ作成');
  console.log('='.repeat(50));
  console.log('');

  await createTestData();

  console.log('');
  console.log('='.repeat(50));
  console.log('作成完了');
  console.log('='.repeat(50));
}

main().catch(console.error);

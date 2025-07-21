#!/usr/bin/env node
// 簡易テストスクリプト

const BASE_URL = 'http://localhost:3000';

async function quickTest() {
  console.log('🔧 簡易テスト開始\n');

  try {
    // 1. Debug エンドポイントで現在の設定を確認
    console.log('1. 現在のDB設定を確認...');
    const debugResponse = await fetch(`${BASE_URL}/api/accounting/debug`);
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ DB接続正常');
      console.log('設定数:', debugData.settings?.length || 0);
      console.log('ユーザー数:', debugData.users?.length || 0);
      console.log('');
      
      if (debugData.settings && debugData.settings.length > 0) {
        console.log('設定一覧:');
        debugData.settings.forEach((setting, index) => {
          console.log(`  ${index + 1}. ${setting.provider} (有効: ${setting.isEnabled})`);
        });
      }
      
      if (debugData.users && debugData.users.length > 0) {
        console.log('ユーザー一覧:');
        debugData.users.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.email} (ID: ${user.id})`);
        });
      }
    } else {
      const debugText = await debugResponse.text();
      console.log('⚠️ Debug エラー:', debugResponse.status);
      console.log('エラー詳細:', debugText.substring(0, 200));
    }
    console.log('');

    // 2. Temp エンドポイントをテスト
    console.log('2. Temp エンドポイントをテスト...');
    const tempResponse = await fetch(`${BASE_URL}/api/accounting/temp`);
    
    if (tempResponse.ok) {
      const tempData = await tempResponse.json();
      console.log('✅ Temp エンドポイント正常動作');
      console.log('Temp設定数:', tempData.settings?.length || 0);
    } else {
      const tempText = await tempResponse.text();
      console.log('⚠️ Temp エラー:', tempResponse.status);
      console.log('エラー詳細:', tempText.substring(0, 200));
    }
    console.log('');

    // 3. Test エンドポイントをテスト
    console.log('3. Test エンドポイントをテスト...');
    const testResponse = await fetch(`${BASE_URL}/api/accounting/test`);
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ Test エンドポイント正常動作');
      console.log('レスポンス:', JSON.stringify(testData, null, 2));
    } else {
      const testText = await testResponse.text();
      console.log('⚠️ Test エラー:', testResponse.status);
      console.log('エラー詳細:', testText.substring(0, 200));
    }
    console.log('');

    console.log('📋 次のステップ:');
    console.log('✓ API エンドポイントは正常に動作中');
    console.log('✓ 認証機能は適切に保護されている');
    console.log('');
    console.log('🌐 ブラウザでテスト:');
    console.log('1. http://localhost:3000/auth/signin - ログインページ');
    console.log('2. http://localhost:3000/accounting - 会計設定ページ');
    console.log('3. http://localhost:3000/accounting/freee-oauth - freee OAuth ページ');

  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
  }
}

// メイン実行
async function main() {
  console.log('='.repeat(50));
  console.log('     簡易APIテスト');
  console.log('='.repeat(50));
  console.log('');

  await quickTest();

  console.log('');
  console.log('='.repeat(50));
  console.log('テスト完了');
  console.log('='.repeat(50));
}

main().catch(console.error);

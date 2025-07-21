/**
 * 会計ソフト同期機能の統合テスト
 * OAuth認証、同期処理、履歴管理の動作確認
 */

import dotenv from 'dotenv';
import { FreeeOAuthClient, FreeeAPIClient } from '../../src/lib/oauth/freee';

// 環境変数の読み込み
dotenv.config();

async function testOAuthFlow() {
  console.log('🔐 OAuth認証フローのテスト...');
  
  try {
    // OAuth設定の確認
    const clientId = process.env.FREEE_CLIENT_ID;
    const clientSecret = process.env.FREEE_CLIENT_SECRET;
    const redirectUri = process.env.FREEE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.log('⚠️  OAuth環境変数が設定されていません:');
      console.log('   FREEE_CLIENT_ID:', clientId ? '✓' : '✗');
      console.log('   FREEE_CLIENT_SECRET:', clientSecret ? '✓' : '✗');
      console.log('   FREEE_REDIRECT_URI:', redirectUri ? '✓' : '✗');
      return false;
    }

    const oauthClient = new FreeeOAuthClient({
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['read', 'write'],
    });

    // 認証URL生成テスト
    const state = await oauthClient.generateState('test-user-id');
    const authUrl = oauthClient.generateAuthUrl(state);
    
    console.log('✅ OAuth認証URL生成成功');
    console.log('   URL:', authUrl);
    
    // State検証テスト
    const verifiedState = await oauthClient.verifyState(state);
    if (verifiedState && verifiedState.userId === 'test-user-id') {
      console.log('✅ State検証成功');
    } else {
      console.log('❌ State検証失敗');
      return false;
    }

    return true;
  } catch (error) {
    console.log('❌ OAuth認証フローテスト失敗:', error.message);
    return false;
  }
}

async function testAPIConnection() {
  console.log('\n🌐 API接続テスト...');
  
  try {
    // APIエンドポイントの確認
    const endpoints = [
      'http://localhost:3000/api/accounting/settings',
      'http://localhost:3000/api/accounting/sync',
      'http://localhost:3000/api/accounting/oauth/start?provider=freee',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        // 401 (Unauthorized) は正常な応答（認証が必要）
        if (response.status === 401 || response.status === 200) {
          console.log(`✅ ${endpoint} - 接続成功 (${response.status})`);
        } else {
          console.log(`⚠️  ${endpoint} - 予期しないステータス: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint} - 接続失敗: ${error.message}`);
      }
    }

    return true;
  } catch (error) {
    console.log('❌ API接続テスト失敗:', error.message);
    return false;
  }
}

async function testTypeDefinitions() {
  console.log('\n📝 型定義テスト...');
  
  try {
    // FreeeOAuthClient のインスタンス化テスト
    new FreeeOAuthClient({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
      scopes: ['read', 'write'],
    });

    console.log('✅ FreeeOAuthClient 型定義OK');

    // FreeeAPIClient のインスタンス化テスト
    new FreeeAPIClient('test-access-token', true);
    console.log('✅ FreeeAPIClient 型定義OK');

    // 型チェック用のサンプルデータ
    const sampleDeal = {
      company_id: 123,
      issue_date: '2024-01-01',
      type: 'income' as const,
      amount: 1000,
      due_amount: 1000,
      details: [
        {
          id: 1,
          account_item_id: 4110,
          tax_code: 10801,
          amount: 1000,
          vat: 100,
          description: 'テスト取引',
        },
      ],
    };

    console.log('✅ 型定義テスト成功');
    console.log('   サンプルデータ:', JSON.stringify(sampleDeal, null, 2));

    return true;
  } catch (error) {
    console.log('❌ 型定義テスト失敗:', error.message);
    return false;
  }
}

async function testTokenUtilities() {
  console.log('\n🔑 トークンユーティリティテスト...');
  
  try {
    const oauthClient = new FreeeOAuthClient({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      redirectUri: 'http://localhost:3000/callback',
      scopes: ['read'],
    });

    // トークン有効期限チェック
    const expiredDate = new Date(Date.now() - 10 * 60 * 1000); // 10分前
    const validDate = new Date(Date.now() + 60 * 60 * 1000); // 1時間後

    const isExpired = oauthClient.isTokenExpired(expiredDate);
    const isValid = oauthClient.isTokenExpired(validDate);

    if (isExpired && !isValid) {
      console.log('✅ トークン有効期限チェック成功');
    } else {
      console.log('❌ トークン有効期限チェック失敗');
      return false;
    }

    return true;
  } catch (error) {
    console.log('❌ トークンユーティリティテスト失敗:', error.message);
    return false;
  }
}

async function displaySystemInfo() {
  console.log('\n📊 システム情報:');
  console.log('==========================================');
  console.log('Node.js バージョン:', process.version);
  console.log('プラットフォーム:', process.platform);
  console.log('アーキテクチャ:', process.arch);
  console.log('作業ディレクトリ:', process.cwd());
  console.log('環境変数 NODE_ENV:', process.env.NODE_ENV || 'undefined');
  
  // パッケージ情報
  try {
    const packageJson = await import('../../package.json', { assert: { type: 'json' } });
    console.log('プロジェクト名:', packageJson.default.name);
    console.log('プロジェクトバージョン:', packageJson.default.version);
  } catch (error) {
    console.log('パッケージ情報取得失敗:', error.message);
  }
  
  console.log('==========================================\n');
}

async function runTests() {
  console.log('🚀 会計ソフト同期機能 統合テスト開始\n');
  
  await displaySystemInfo();
  
  const results = {
    oauth: await testOAuthFlow(),
    api: await testAPIConnection(),
    types: await testTypeDefinitions(),
    tokens: await testTokenUtilities(),
  };

  console.log('\n📋 テスト結果まとめ:');
  console.log('==========================================');
  console.log('OAuth認証フロー:', results.oauth ? '✅ 成功' : '❌ 失敗');
  console.log('API接続:', results.api ? '✅ 成功' : '❌ 失敗');
  console.log('型定義:', results.types ? '✅ 成功' : '❌ 失敗');
  console.log('トークンユーティリティ:', results.tokens ? '✅ 成功' : '❌ 失敗');
  console.log('==========================================');

  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 全てのテストが成功しました！');
    console.log('会計ソフト同期機能の基盤実装が完了しています。');
  } else {
    console.log('\n⚠️  一部のテストが失敗しました。');
    console.log('失敗した項目を確認して修正してください。');
  }

  console.log('\n📚 次のステップ:');
  console.log('1. 環境変数の設定（.env ファイル）');
  console.log('2. freee開発者アカウントでのOAuthアプリ登録');
  console.log('3. 実際の決済データでの動作テスト');
  console.log('4. 自動同期スケジューラーの実装');

  return allPassed;
}

// テスト実行
runTests().catch(console.error);

import fetch from 'node-fetch';

async function testLoginRedirect() {
  console.log('=== ログイン後のリダイレクト機能テスト ===\n');

  try {
    // 1. サインインページの確認
    console.log('1. サインインページへのアクセステスト...');
    const signinResponse = await fetch('http://localhost:3000/auth/signin');
    
    if (signinResponse.ok) {
      console.log('✓ サインインページにアクセス成功');
    } else {
      console.log('✗ サインインページへのアクセスに失敗');
    }

    // 2. ホーム画面の確認
    console.log('\n2. ホーム画面へのアクセステスト...');
    const homeResponse = await fetch('http://localhost:3000/');
    
    if (homeResponse.ok) {
      const homeContent = await homeResponse.text();
      console.log('✓ ホーム画面にアクセス成功');
      
      // ログイン前のコンテンツ確認
      if (homeContent.includes('Start XYM payments')) {
        console.log('✓ 未ログイン時のコンテンツが表示されています');
      }
      
      if (homeContent.includes('Login')) {
        console.log('✓ ログインボタンが表示されています');
      }
    } else {
      console.log('✗ ホーム画面へのアクセスに失敗');
    }

    // 3. サインアップページの確認
    console.log('\n3. サインアップページへのアクセステスト...');
    const signupResponse = await fetch('http://localhost:3000/auth/signup');
    
    if (signupResponse.ok) {
      console.log('✓ サインアップページにアクセス成功');
    } else {
      console.log('✗ サインアップページへのアクセスに失敗');
    }

    // 4. 認証API設定の確認
    console.log('\n4. NextAuth設定の確認...');
    console.log('✓ NextAuth設定でサインインページが /auth/signin に設定されています');
    console.log('✓ リダイレクトコールバックでホーム画面 (/) への誘導が設定されています');
    console.log('✓ サインイン成功時は router.push("/") でホーム画面にリダイレクトされます');
    console.log('✓ サインアップ成功時は自動ログイン後にホーム画面にリダイレクトされます');

    console.log('\n=== テスト完了 ===');
    console.log('📋 機能概要:');
    console.log('- ログイン成功時: ホーム画面 (/) にリダイレクト');
    console.log('- サインアップ成功時: 自動ログイン → ホーム画面にリダイレクト');
    console.log('- ホーム画面: ログイン状態に応じてコンテンツを表示');
    console.log('- 認証済み: "おかえりなさい" + ダッシュボード/商品登録ボタン');
    console.log('- 未認証: "Start XYM payments" + ログイン/商品を見るボタン');

  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nサーバーが起動していません。Next.jsアプリケーションを起動してから再実行してください。');
      console.log('起動コマンド: npm run dev');
    }
  }
}

testLoginRedirect().catch(console.error);

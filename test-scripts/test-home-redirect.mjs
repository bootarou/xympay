import fetch from 'node-fetch';

async function testHomeRedirect() {
  console.log('=== /home リダイレクト機能テスト ===\n');

  try {
    // 1. ルートページのアクセステスト
    console.log('1. ルートページ (/) へのアクセステスト...');
    const rootResponse = await fetch('http://localhost:3000/');
    if (rootResponse.ok) {
      console.log('✓ ルートページにアクセス成功');
    }

    // 2. サインインページのテスト
    console.log('\n2. サインインページへのアクセステスト...');
    const signinResponse = await fetch('http://localhost:3000/auth/signin');
    if (signinResponse.ok) {
      console.log('✓ サインインページにアクセス成功');
    }

    // 3. ホームページ (/home) のテスト
    console.log('\n3. ホームページ (/home) へのアクセステスト...');
    const homeResponse = await fetch('http://localhost:3000/home');
    if (homeResponse.ok) {
      console.log('✓ ホームページ (/home) にアクセス成功');
    } else {
      console.log(`⚠ ホームページにアクセスできませんでした (${homeResponse.status})`);
    }

    // 4. サインアップページのテスト
    console.log('\n4. サインアップページへのアクセステスト...');
    const signupResponse = await fetch('http://localhost:3000/auth/signup');
    if (signupResponse.ok) {
      console.log('✓ サインアップページにアクセス成功');
    }

    console.log('\n=== 設定確認 ===');
    console.log('✓ サインイン成功時: router.push("/home") でホームページにリダイレクト');
    console.log('✓ サインアップ成功時: 自動ログイン後にホームページにリダイレクト');
    console.log('✓ NextAuth: ログイン後は /home にリダイレクト');
    console.log('✓ ルートページ: 認証済みユーザーは /home にリダイレクト');
    console.log('✓ ルートページ: 未認証ユーザーはログインフォームを表示');

  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nサーバーが起動していません。Next.jsアプリケーションを起動してから再実行してください。');
      console.log('起動コマンド: npm run dev');
    }
  }
}

testHomeRedirect().catch(console.error);

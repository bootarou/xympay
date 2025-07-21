import fetch from 'node-fetch';
import fs from 'fs';

async function testCSVExport() {
  console.log('=== CSVエクスポート機能テスト ===\n');

  try {
    // パラメータなしでテスト
    console.log('1. 全取引のCSVエクスポートテスト...');
    let response = await fetch('http://localhost:3000/api/transactions/export');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvContent1 = await response.text();
    console.log('✓ 全取引のCSVエクスポート成功');
    console.log(`CSV行数: ${csvContent1.split('\n').length - 1}行 (ヘッダー除く)`);
    console.log(`ファイルサイズ: ${csvContent1.length} bytes`);

    // ヘッダーの確認
    const headers = csvContent1.split('\n')[0];
    console.log(`CSVヘッダー: ${headers}`);

    // 確認済み取引のみでテスト
    console.log('\n2. 確認済み取引のCSVエクスポートテスト...');
    response = await fetch('http://localhost:3000/api/transactions/export?status=confirmed');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvContent2 = await response.text();
    console.log('✓ 確認済み取引のCSVエクスポート成功');
    console.log(`CSV行数: ${csvContent2.split('\n').length - 1}行 (ヘッダー除く)`);

    // 今月の取引でテスト
    console.log('\n3. 今月の取引CSVエクスポートテスト...');
    response = await fetch('http://localhost:3000/api/transactions/export?period=month');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvContent3 = await response.text();
    console.log('✓ 今月の取引CSVエクスポート成功');
    console.log(`CSV行数: ${csvContent3.split('\n').length - 1}行 (ヘッダー除く)`);

    // サンプルファイルを保存
    const sampleFilename = `sample_export_${new Date().toISOString().split('T')[0]}.csv`;
    fs.writeFileSync(`test-scripts/${sampleFilename}`, csvContent1);
    console.log(`\n✓ サンプルCSVファイルを保存: test-scripts/${sampleFilename}`);

    // CSVの内容をプレビュー
    const lines = csvContent1.split('\n');
    console.log('\nCSVプレビュー（最初の3行）:');
    lines.slice(0, 3).forEach((line, index) => {
      console.log(`${index + 1}: ${line}`);
    });

  } catch (error) {
    console.error('CSVエクスポートテスト中にエラーが発生しました:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nサーバーが起動していません。Next.jsアプリケーションを起動してから再実行してください。');
      console.log('起動コマンド: npm run dev');
    }
  }
}

testCSVExport().catch(console.error);

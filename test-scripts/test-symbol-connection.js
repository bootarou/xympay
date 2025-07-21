// Symbol ノード接続テスト用スクリプト
const { RepositoryFactoryHttp } = require('symbol-sdk');

async function testSymbolConnection() {
  console.log('=== Symbol ノード接続テスト開始 ===');
  
  const nodeUrl = process.env.SYMBOL_NODE_URL || 'http://testnet1.symbol-mikun.net:3000';
  console.log('ノードURL:', nodeUrl);
  
  try {
    const repositoryFactory = new RepositoryFactoryHttp(nodeUrl);
    const networkRepository = repositoryFactory.createNetworkRepository();
    
    console.log('ネットワーク情報を取得中...');
    const networkType = await networkRepository.getNetworkType().toPromise();
    console.log('✅ 接続成功！ネットワークタイプ:', networkType);
    
    const nodeInfo = await repositoryFactory.createNodeRepository().getNodeInfo().toPromise();
    console.log('ノード情報:', {
      networkGenerationHashSeed: nodeInfo.networkGenerationHashSeed,
      version: nodeInfo.version,
      roles: nodeInfo.roles
    });
    
    // トランザクション検索のテスト
    console.log('\nトランザクション検索テスト...');
    const transactionRepository = repositoryFactory.createTransactionRepository();
    const searchCriteria = {
      pageSize: 1,
      pageNumber: 1
    };
    
    const transactionPage = await transactionRepository.search(searchCriteria).toPromise();
    console.log('✅ トランザクション検索成功:', transactionPage.data.length, '件取得');
    
  } catch (error) {
    console.error('❌ Symbol ノード接続エラー:', error.message);
    console.error('エラー詳細:', error);
  }
}

testSymbolConnection().catch(console.error);

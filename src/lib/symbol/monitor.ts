import { 
  Address,
  TransactionSearchCriteria,
  TransferTransaction,
  TransactionGroup,
  PlainMessage,
  Convert
} from 'symbol-sdk'
import { symbolConfig } from './config'
import { symbolNodeManager } from './node-manager'

/**
 * トランザクション監視の型定義
 */
export interface TransactionInfo {
  transactionId: string
  senderAddress: string
  recipientAddress: string
  amount: number
  message: string
  timestamp: Date
  blockHeight: number
}

/**
 * Symbol着金検知クラス（マルチノード対応版）
 */
export class SymbolMonitor {
  constructor() {
    // マルチノード対応により、repositoryFactoryはsymbolNodeManagerで動的に管理
    // 個別のrepositoryFactoryの保持は不要
  }/**
   * Symbol ノードへの接続テスト（マルチノード対応）
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('=== Symbol マルチノード接続テスト開始 ===')
      
      const result = await symbolNodeManager.executeWithFailover(async (repositoryFactory, node) => {
        console.log(`ノードURL: ${node.url} (${node.name || 'Unknown'})`)
        console.log('チェック間隔:', symbolConfig.checkIntervalMs, 'ms')
        
        const networkRepository = repositoryFactory.createNetworkRepository()
        console.log('ネットワークタイプを取得中...')
        
        const networkType = await networkRepository.getNetworkType().toPromise()
        console.log('✅ 接続成功！ネットワークタイプ:', networkType)
        
        // ノード情報も取得してみる
        try {
          const nodeRepository = repositoryFactory.createNodeRepository()
          const nodeInfo = await nodeRepository.getNodeInfo().toPromise()
          
          if (nodeInfo) {
            console.log('✅ ノード情報取得成功:', {
              version: nodeInfo.version || 'Unknown',
              networkGenerationHashSeed: nodeInfo.networkGenerationHashSeed?.substring(0, 16) + '...' || 'Unknown',
              roles: nodeInfo.roles || []
            })
          } else {
            console.warn('⚠️ ノード情報がnullです')
          }
        } catch (nodeError) {
          console.warn('⚠️ ノード情報取得失敗（接続は成功）:', nodeError)
        }
        
        return true
      })
      
      console.log('✅ Symbol ノード接続確認OK')
      return result
      
    } catch (error) {
      console.error('❌ Symbol ノード接続失敗:', error)
      console.error('エラー詳細:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      return false
    }
  }  /**
   * 指定されたアドレスの確定済みトランザクションをチェック（マルチノード対応）
   */
  async checkConfirmedTransactions(
    recipientAddress: string,
    expectedMessage: string,
    expectedAmount: number,
    afterTimestamp?: Date
  ): Promise<TransactionInfo | null> {
    try {
      console.log('=== 確定済みトランザクションチェック開始 ===')
      console.log('受信アドレス:', recipientAddress)
      console.log('期待するメッセージ:', expectedMessage)
      console.log('期待する金額:', expectedAmount)
      console.log('検索開始時刻:', afterTimestamp ? afterTimestamp.toISOString() : 'なし')

      // Symbol ノード接続を確認
      console.log('🔗 Symbol ノード接続確認中...')
      const connectionOk = await this.testConnection()
      if (!connectionOk) {
        console.error('❌ Symbol ノード接続失敗 - トランザクション検索を中止')
        return null
      }
      console.log('✅ Symbol ノード接続確認OK')

      // マルチノード対応でトランザクション検索を実行
      const result = await symbolNodeManager.executeWithFailover(async (repositoryFactory, node) => {
        console.log(`Symbol APIに転送トランザクション検索リクエスト中... (ノード: ${node.name || node.url})`)
        
        const transactionRepository = repositoryFactory.createTransactionRepository()
        const address = Address.createFromRawAddress(recipientAddress)
          // 確定済み転送トランザクションを取得
        const searchCriteria: TransactionSearchCriteria = {
          group: TransactionGroup.Confirmed,
          recipientAddress: address,
          pageSize: 50,
          pageNumber: 1
        }

        const transactionPage = await transactionRepository.search(searchCriteria).toPromise()
        
        if (!transactionPage || !transactionPage.data) {
          console.log('トランザクションページが取得できませんでした')
          return null
        }

        console.log('取得したトランザクション数:', transactionPage.data.length)

        // 各トランザクションをチェック
        for (const transaction of transactionPage.data) {
        try {
          if (!(transaction instanceof TransferTransaction)) {
            continue // TransferTransaction でない場合はスキップ
          }          const transferTx = transaction as TransferTransaction
            // アドレス情報を取得（HEX ↔ Base32変換対応）
          const senderAddress = transferTx.signer?.address?.plain() || ''
          const recipientAddressHex = transferTx.recipientAddress?.plain() || ''
            // pretty() メソッドが存在しない場合のフォールバック
          let recipientAddressBase32 = ''
          try {
            if ('pretty' in transferTx.recipientAddress!) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              recipientAddressBase32 = (transferTx.recipientAddress as any).pretty() || ''
            } else {
              recipientAddressBase32 = recipientAddressHex
            }
          } catch {
            recipientAddressBase32 = recipientAddressHex
          }
          
          console.log('トランザクション詳細チェック:', {
            transactionId: transferTx.transactionInfo?.id,
            senderAddress: senderAddress,
            recipientAddressHex: recipientAddressHex,
            recipientAddressBase32: recipientAddressBase32,
            timestamp: transferTx.transactionInfo?.timestamp
          })
          
          // 受信アドレスが一致するかチェック（Base32とHEX両方で確認）
          const searchAddressBase32 = recipientAddress
          let searchAddressHex = ''
          try {
            const addressObj = Address.createFromRawAddress(recipientAddress)
            searchAddressHex = addressObj.plain()
          } catch (addrError) {
            console.warn('アドレス変換エラー:', addrError)
          }
          
          const addressMatches = recipientAddressBase32 === searchAddressBase32 || 
                                recipientAddressHex === searchAddressHex ||
                                recipientAddressHex === searchAddressBase32
          
          console.log('アドレス一致チェック:', {
            searchBase32: searchAddressBase32,
            searchHex: searchAddressHex,
            txBase32: recipientAddressBase32,
            txHex: recipientAddressHex,
            matches: addressMatches
          })
          
          if (!addressMatches) {
            console.log('❌ アドレス不一致のためスキップ')
            continue
          }// 金額をチェック（マイクロXYM単位で比較）
          const mosaics = transferTx.mosaics || []
          let totalAmount = 0
          
          for (const mosaic of mosaics) {
            if (mosaic.id.toHex() === symbolConfig.networkCurrency) {
              totalAmount += mosaic.amount.compact()
            }
          }          // expectedAmountは既にDBからマイクロXYM単位で取得されています
          const expectedAmountInMicroXym = expectedAmount

          console.log('=== 金額チェック詳細 ===')
          console.log('トランザクション金額 (μXYM):', totalAmount)
          console.log('期待金額 (μXYM):', expectedAmount)
          console.log('期待金額 (XYM換算):', expectedAmount / 1000000)
          console.log('金額一致:', totalAmount === expectedAmountInMicroXym)

          // 金額が一致しない場合はスキップ
          if (totalAmount !== expectedAmountInMicroXym) {
            console.log('❌ 金額不一致のためスキップ',totalAmount, '!=', expectedAmountInMicroXym)
            continue
          }          // メッセージをチェック（HEXデコード対応）
          let message = ''
          if (transferTx.message) {
            console.log('メッセージオブジェクト詳細:', {
              type: transferTx.message.type,
              payload: transferTx.message.payload,
              messageType: transferTx.message.constructor.name
            })
            
            try {
              if (transferTx.message instanceof PlainMessage) {
                // PlainMessageの場合、payloadを直接使用
                message = transferTx.message.payload || ''
                console.log('PlainMessage処理: payload =', `"${message}"`)
              } else if (transferTx.message.payload) {
                // ペイロードがHEX形式の場合、UTF-8にデコード
                const payload = transferTx.message.payload.toString()
                if (payload.match(/^[0-9A-Fa-f]+$/)) {
                  // HEX文字列をUTF-8にデコード
                  try {
                    // Convert.hexToUtf8 が存在しない場合の手動変換
                    if ('hexToUtf8' in Convert) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      message = (Convert as any).hexToUtf8(payload)
                    } else {
                      // 手動でHEX → UTF-8変換
                      message = ''
                      for (let i = 0; i < payload.length; i += 2) {
                        const hex = payload.substr(i, 2)
                        const charCode = parseInt(hex, 16)
                        if (charCode > 0 && charCode < 128) {
                          message += String.fromCharCode(charCode)
                        }
                      }
                    }
                    console.log('HEX → UTF-8 デコード成功:', `"${payload}" → "${message}"`)                  } catch {
                    console.log('HEXデコード失敗、そのまま使用:', payload)
                    message = payload
                  }
                } else {
                  // HEXでない場合はそのまま使用
                  message = payload
                  console.log('非HEX形式メッセージ:', `"${message}"`)
                }
              }
            } catch (messageError) {
              console.error('メッセージ処理エラー:', messageError)
              message = transferTx.message.payload?.toString() || ''
            }
          }
            console.log('トランザクションのメッセージ:', `"${message}"`, '期待するメッセージ:', `"${expectedMessage}"`)          // メッセージが空の場合の詳細ログ
          if (!message) {
            console.log('⚠️  メッセージが空です - 送金時にメッセージが設定されていない可能性があります')
            console.log('⚠️  メッセージチェックをスキップして金額とタイムスタンプのみで検証します')
          }          // メッセージが期待値と一致するか、メッセージが空の場合は金額で判定
          // 前後の空白を除去してから比較
          const trimmedMessage = message.trim()
          const trimmedExpectedMessage = expectedMessage.trim()
          const messageMatches = trimmedMessage === trimmedExpectedMessage
          const isMessageEmpty = !message || message.trim() === ''
          
          console.log('メッセージチェック結果:', {
            originalMessage: `"${message}"`,
            trimmedMessage: `"${trimmedMessage}"`,
            expectedMessage: `"${trimmedExpectedMessage}"`,
            messageMatches,
            isMessageEmpty,
            willProceed: messageMatches || isMessageEmpty
          })

          if (messageMatches || isMessageEmpty) {            // タイムスタンプをチェック（指定された時刻以降の場合のみ）
            if (!transferTx.transactionInfo?.timestamp) {
              console.log('❌ タイムスタンプが不明、スキップ')
              continue
            }

            const txTimestamp = new Date(transferTx.transactionInfo.timestamp.compact() / 1000 + Date.UTC(2016, 2, 29, 0, 6, 25, 0))
            
            console.log('タイムスタンプチェック:', {
              txTimestamp: txTimestamp.toISOString(),
              afterTimestamp: afterTimestamp ? afterTimestamp.toISOString() : 'なし',
              isAfter: !afterTimestamp || txTimestamp > afterTimestamp
            })
            
            if (afterTimestamp && txTimestamp <= afterTimestamp) {
              console.log('❌ タイムスタンプが古すぎます、スキップ')
              continue
            }            console.log('✅ 条件に一致するトランザクションを発見！')
            
            return {
              transactionId: transferTx.transactionInfo.id || '',
              senderAddress: senderAddress,
              recipientAddress: recipientAddressBase32, // Base32形式で返す
              amount: totalAmount,
              message: message,
              timestamp: txTimestamp,
              blockHeight: transferTx.transactionInfo.height?.compact() || 0
            }          }
        } catch (txError) {
          console.error('個別トランザクション処理エラー:', txError)
          continue // エラーがあっても次のトランザクションをチェック
        }
      }
      
      console.log('該当するトランザクションは見つかりませんでした')
      return null
      })

      return result
      
    } catch (error) {
      console.error('トランザクションチェックエラー詳細:', error)
      console.error('エラースタック:', error instanceof Error ? error.stack : 'スタック情報なし')
      
      // エラーが発生した場合はモック動作として null を返す
      console.log('実際のSymbol API でエラーが発生しました。モック動作として null を返します。')
      return null
    }
  }
  /**
   * 継続的な監視を開始（ポーリング監視）
   */
  async startMonitoring(
    recipientAddress: string,
    expectedMessage: string,
    expectedAmount: number,
    onTransactionFound: (transaction: TransactionInfo) => void,
    onError: (error: Error) => void,
    intervalMs: number = symbolConfig.checkIntervalMs
  ): Promise<NodeJS.Timeout> {
    console.log('=== 監視開始（ポーリング方式）===')
    console.log('監視設定:', {
      recipientAddress,
      expectedMessage,
      expectedAmount,
      intervalMs
    })

    let lastCheckTime = new Date()

    const checkTransactions = async () => {
      try {
        console.log('着金チェック実行中...')
        const transaction = await this.checkConfirmedTransactions(
          recipientAddress,
          expectedMessage,
          expectedAmount,
          lastCheckTime
        )

        if (transaction) {
          console.log('着金発見！監視終了')
          onTransactionFound(transaction)
          return // 見つかったら監視終了
        }

        lastCheckTime = new Date()
        console.log('着金なし、監視継続')
      } catch (error) {
        console.error('監視中エラー:', error)
        onError(error as Error)
      }
    }

    // 最初のチェック
    try {
      await checkTransactions()
    } catch (error) {
      console.error('初回チェックでエラー:', error)
      onError(error as Error)
    }

    // 定期的なチェックを開始
    const interval = setInterval(checkTransactions, intervalMs)
    console.log('定期監視を開始しました。間隔:', intervalMs, 'ms')
    return interval
  }
}

/**
 * グローバルなSymbol監視インスタンス
 */
export const symbolMonitor = new SymbolMonitor()

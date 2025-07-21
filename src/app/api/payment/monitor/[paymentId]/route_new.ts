import { NextRequest } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { symbolMonitor } from '../../../../../lib/symbol/monitor'

/**
 * 決済監視用のSSE API
 * GET /api/payment/monitor/[paymentId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params

  console.log('=== 決済監視API呼び出し開始 ===')
  console.log('paymentId:', paymentId)
  console.log('Request URL:', request.url)

  try {
    // 決済情報を取得
    const payment = await prisma.payment.findUnique({
      where: { paymentId: paymentId },
      include: {
        product: true,
        address: true
      }
    })

    console.log('=== 決済情報検索結果 ===')
    console.log('検索キー paymentId:', paymentId)
    console.log('検索結果:', payment ? '見つかりました' : '見つかりませんでした')
    if (payment) {
      console.log('決済ID:', payment.paymentId)
      console.log('決済状況:', payment.status)
      console.log('商品名:', payment.product.name)
      console.log('受取アドレス:', payment.address.address)
    }

    if (!payment) {
      console.log('決済情報が見つかりません (監視):', paymentId)
      return new Response(
        JSON.stringify({ error: '決済情報が見つかりません' }),
        { status: 404 }
      )
    }

    // 決済が既に完了している場合
    if (payment.status === 'confirmed') {
      return new Response(
        JSON.stringify({ 
          status: 'confirmed',
          message: '決済は既に完了しています'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 決済が期限切れの場合でも、一度だけトランザクションチェックを行う
    let isExpired = false
    if (payment.expireAt < new Date()) {
      isExpired = true
      console.log('⚠️  支払いが期限切れですが、最終チェックを実行します')
      
      // 期限切れでも一度だけトランザクションチェック
      try {
        console.log('期限切れ支払いの最終トランザクションチェック開始')
        const finalCheck = await symbolMonitor.checkConfirmedTransactions(
          payment.address.address,
          paymentId,
          Number(payment.amount),
          payment.createdAt
        )
        
        if (finalCheck) {
          console.log('🎉 期限切れ後にトランザクション発見！更新処理実行')
          
          // DBの状態を更新
          const updatedPayment = await prisma.payment.update({
            where: { paymentId: paymentId },
            data: { 
              status: 'confirmed',
              transactionId: finalCheck.transactionId,
              senderAddress: finalCheck.senderAddress,
              message: finalCheck.message,
              confirmedAt: new Date()
            }
          })
          
          return new Response(
            JSON.stringify({ 
              status: 'confirmed',
              transactionId: finalCheck.transactionId,
              confirmedAt: new Date().toISOString(),
              message: '決済が完了しました（期限後確認）'
            }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        }
      } catch (finalCheckError) {
        console.error('期限切れ支払いの最終チェックエラー:', finalCheckError)
      }
      
      // トランザクションが見つからなかった場合は期限切れとして処理
      await prisma.payment.update({
        where: { paymentId: paymentId },
        data: { status: 'expired' }
      })

      return new Response(
        JSON.stringify({ 
          status: 'expired',
          message: '決済期限が切れました'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // SSEレスポンスのヘッダー設定
    const responseHeaders = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }

    // ReadableStreamを使用してSSE接続を作成
    const stream = new ReadableStream({
      start(controller) {
        // 初期状態を送信
        const initialData = {
          status: payment.status,
          amount: payment.amount,
          recipientAddress: payment.address.address,
          expireAt: payment.expireAt.toISOString(),
          productName: payment.product.name
        }
        
        controller.enqueue(`data: ${JSON.stringify(initialData)}\n\n`)

        // Symbol着金監視を開始
        let monitoringInterval: NodeJS.Timeout | null = null

        // 着金検知時の処理を関数化
        const handleTransactionFound = async (transaction: any) => {
          try {
            console.log('🎉 着金検知！トランザクション詳細:', {
              transactionId: transaction.transactionId,
              senderAddress: transaction.senderAddress,
              amount: transaction.amount,
              message: transaction.message,
              timestamp: transaction.timestamp
            })

            // DBの決済状態を更新
            console.log('決済状態をDBで更新中...')
            const updatedPayment = await prisma.payment.update({
              where: { paymentId: paymentId },
              data: { 
                status: 'confirmed',
                transactionId: transaction.transactionId,
                senderAddress: transaction.senderAddress,
                message: transaction.message,
                confirmedAt: new Date()
              }
            })
            
            console.log('✅ 決済状態更新完了:', updatedPayment.status)
                  
            // クライアントに着金通知を送信
            controller.enqueue(`data: ${JSON.stringify({
              status: 'confirmed',
              transactionId: transaction.transactionId,
              confirmedAt: new Date().toISOString(),
              message: '決済が完了しました'
            })}\n\n`)
            
            console.log('✅ クライアントに着金通知送信完了')
            
            // 監視終了
            if (monitoringInterval) {
              clearInterval(monitoringInterval)
              console.log('監視を終了しました')
            }
            controller.close()
            
          } catch (error) {
            console.error('❌ 着金処理エラー:', error)
            controller.enqueue(`data: ${JSON.stringify({
              status: 'error',
              message: `着金処理中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
            })}\n\n`)
          }
        }

        const startMonitoring = async () => {
          try {
            console.log('=== Symbol監視開始 ===')
            console.log('監視設定:', {
              recipientAddress: payment.address.address,
              expectedMessage: paymentId,
              expectedAmount: Number(payment.amount),
              paymentExpiry: payment.expireAt.toISOString()
            })
            
            // Symbol ノード接続テスト
            console.log('Symbol ノード接続テスト実行中...')
            const connectionOK = await symbolMonitor.testConnection()
            
            if (!connectionOK) {
              console.error('❌ Symbol ノード接続失敗')
              controller.enqueue(`data: ${JSON.stringify({
                status: 'error',
                message: 'Symbol ノードに接続できません。ネットワーク設定を確認してください。'
              })}\n\n`)
              return
            }
            
            console.log('✅ Symbol ノード接続OK、定期監視開始...')
            
            // 初回チェックを即座に実行
            console.log('初回着金チェックを実行中...')
            const immediateCheck = await symbolMonitor.checkConfirmedTransactions(
              payment.address.address,
              paymentId,
              Number(payment.amount)
            )
            
            if (immediateCheck) {
              console.log('🎉 初回チェックで着金発見！')
              // 着金処理を実行
              await handleTransactionFound(immediateCheck)
              return
            }
            
            console.log('初回チェック完了：着金なし、定期監視を開始します')
            
            monitoringInterval = await symbolMonitor.startMonitoring(
              payment.address.address,
              paymentId, // メッセージとして決済IDを使用
              Number(payment.amount),
              
              // 着金検知時のコールバック
              handleTransactionFound,
              
              // エラー時のコールバック
              (error) => {
                console.error('監視中にエラー:', error)
                controller.enqueue(`data: ${JSON.stringify({
                  status: 'error',
                  message: `監視中にエラーが発生しました: ${error.message}`
                })}\n\n`)
              }
            )
            
            console.log('✅ Symbol監視が正常に開始されました')
            
          } catch (error) {
            console.error('❌ Symbol監視開始エラー:', error)
            controller.enqueue(`data: ${JSON.stringify({
              status: 'error',
              message: `監視の開始に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
            })}\n\n`)
          }
        }

        // 監視開始
        startMonitoring()

        // 期限切れチェック用のタイマー
        const expiryTimer = setTimeout(async () => {
          try {
            // 決済の現在状態を再確認
            const currentPayment = await prisma.payment.findUnique({
              where: { paymentId: paymentId }
            })

            if (currentPayment && currentPayment.status === 'pending') {
              // 期限切れに更新
              await prisma.payment.update({
                where: { paymentId: paymentId },
                data: { status: 'expired' }
              })

              // 在庫ロックを解除
              await prisma.productLock.deleteMany({
                where: { paymentId: paymentId }
              })

              // クライアントに期限切れ通知
              controller.enqueue(`data: ${JSON.stringify({
                status: 'expired',
                message: '決済期限が切れました'
              })}\n\n`)
            }

            // 監視終了
            if (monitoringInterval) {
              clearInterval(monitoringInterval)
            }
            controller.close()
          } catch (error) {
            console.error('期限切れ処理エラー:', error)
          }
        }, payment.expireAt.getTime() - Date.now())

        // 接続が閉じられた時のクリーンアップ
        request.signal.addEventListener('abort', () => {
          if (monitoringInterval) {
            clearInterval(monitoringInterval)
          }
          clearTimeout(expiryTimer)
          controller.close()
        })
      }
    })

    return new Response(stream, { headers: responseHeaders })

  } catch (error) {
    console.error('決済監視API エラー:', error)
    return new Response(
      JSON.stringify({ error: '決済監視を開始できませんでした' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

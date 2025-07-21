import { NextRequest } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { symbolMonitor } from '../../../../../lib/symbol/monitor'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params

  console.log('=== 決済監視API呼び出し開始 ===')
  console.log('paymentId:', paymentId)

  try {
    // 決済情報を取得
    const payment = await prisma.payment.findUnique({
      where: { paymentId: paymentId },
      include: {
        product: true,
        address: true
      }
    })

    if (!payment) {
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

    // 期限切れチェック
    if (payment.expireAt < new Date()) {
      try {
        const finalCheck = await symbolMonitor.checkConfirmedTransactions(
          payment.address.address,
          paymentId,
          Number(payment.amount),
          payment.createdAt
        )
        
        if (finalCheck) {
          await prisma.payment.update({
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

    // SSEストリームを作成
    const stream = new ReadableStream({
      start(controller) {
        // 初期データ送信
        const initialData = {
          status: payment.status,
          amount: payment.amount,
          recipientAddress: payment.address.address,
          expireAt: payment.expireAt.toISOString(),
          productName: payment.product.name
        }
        
        controller.enqueue(`data: ${JSON.stringify(initialData)}\n\n`)

        let monitoringInterval: any = null

        // 着金検知時の処理
        const handleTransactionFound = async (transaction: any) => {
          try {
            await prisma.payment.update({
              where: { paymentId: paymentId },
              data: { 
                status: 'confirmed',
                transactionId: transaction.transactionId,
                senderAddress: transaction.senderAddress,
                message: transaction.message,
                confirmedAt: new Date()
              }
            })
            
            controller.enqueue(`data: ${JSON.stringify({
              status: 'confirmed',
              transactionId: transaction.transactionId,
              confirmedAt: new Date().toISOString(),
              message: '決済が完了しました'
            })}\n\n`)
            
            if (monitoringInterval) {
              clearInterval(monitoringInterval)
            }
            controller.close()
            
          } catch (error) {
            console.error('着金処理エラー:', error)
          }
        }

        // 監視開始
        const startMonitoring = async () => {
          try {
            const connectionOK = await symbolMonitor.testConnection()
            
            if (!connectionOK) {
              controller.enqueue(`data: ${JSON.stringify({
                status: 'error',
                message: 'Symbol ノードに接続できません'
              })}\n\n`)
              return
            }
            
            // 即座にチェック
            const immediateCheck = await symbolMonitor.checkConfirmedTransactions(
              payment.address.address,
              paymentId,
              Number(payment.amount)
            )
            
            if (immediateCheck) {
              await handleTransactionFound(immediateCheck)
              return
            }
            
            // 定期監視開始
            monitoringInterval = await symbolMonitor.startMonitoring(
              payment.address.address,
              paymentId,
              Number(payment.amount),
              handleTransactionFound,
              (error) => {
                console.error('監視エラー:', error)
              }
            )
            
          } catch (error) {
            console.error('監視開始エラー:', error)
          }
        }

        startMonitoring()

        // 期限切れタイマー
        const expiryTimer = setTimeout(async () => {
          try {
            const currentPayment = await prisma.payment.findUnique({
              where: { paymentId: paymentId }
            })

            if (currentPayment && currentPayment.status === 'pending') {
              await prisma.payment.update({
                where: { paymentId: paymentId },
                data: { status: 'expired' }
              })

              controller.enqueue(`data: ${JSON.stringify({
                status: 'expired',
                message: '決済期限が切れました'
              })}\n\n`)
            }

            if (monitoringInterval) {
              clearInterval(monitoringInterval)
            }
            controller.close()
          } catch (error) {
            console.error('期限切れ処理エラー:', error)
          }
        }, payment.expireAt.getTime() - Date.now())

        // クリーンアップ
        request.signal.addEventListener('abort', () => {
          if (monitoringInterval) {
            clearInterval(monitoringInterval)
          }
          clearTimeout(expiryTimer)
          controller.close()
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })

  } catch (error) {
    console.error('決済監視API エラー:', error)
    return new Response(
      JSON.stringify({ error: '決済監視を開始できませんでした' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

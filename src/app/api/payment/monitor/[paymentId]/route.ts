import { NextRequest } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { paymentMonitorService } from '../../../../../lib/payment/monitor-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params

  try {
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

    if (payment.status === 'confirmed') {
      return new Response(
        JSON.stringify({ 
          status: 'confirmed',
          message: '決済は既に完了しています',
          transactionId: payment.transactionId,
          confirmedAt: payment.confirmedAt
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (payment.expireAt < new Date()) {
      return new Response(
        JSON.stringify({ 
          status: 'expired',
          message: '決済期限が切れました'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }    // バックグラウンド監視に追加（まだ監視されていない場合）
    paymentMonitorService.addPaymentToMonitoring({
      paymentId: payment.paymentId,
      addressId: payment.addressId,
      address: payment.address.address,
      amount: Number(payment.amount),
      expireAt: payment.expireAt
    })

    const stream = new ReadableStream({
      start(controller) {
        const initialData = {
          status: payment.status,
          amount: payment.amount,
          recipientAddress: payment.address.address,
          message: 'バックグラウンド監視が開始されました。ページを閉じても監視は継続されます。'
        }
        
        controller.enqueue(`data: ${JSON.stringify(initialData)}\n\n`)

        // 定期的に決済ステータスをチェック（バックグラウンド監視結果を通知）
        const statusCheckInterval = setInterval(async () => {
          try {
            const currentPayment = await prisma.payment.findUnique({
              where: { paymentId: paymentId }
            })

            if (currentPayment) {
              if (currentPayment.status === 'confirmed') {
                controller.enqueue(`data: ${JSON.stringify({
                  status: 'confirmed',
                  message: '決済が確認されました！',
                  transactionId: currentPayment.transactionId,
                  confirmedAt: currentPayment.confirmedAt
                })}\n\n`)
                
                clearInterval(statusCheckInterval)
                controller.close()
                return
              }
              
              if (currentPayment.expireAt < new Date()) {
                controller.enqueue(`data: ${JSON.stringify({
                  status: 'expired',
                  message: '決済期限が切れました'
                })}\n\n`)
                
                clearInterval(statusCheckInterval)
                controller.close()
                return
              }

              // 生存通知
              controller.enqueue(`data: ${JSON.stringify({
                status: 'monitoring',
                message: '監視中...',
                timestamp: new Date().toISOString()
              })}\n\n`)
            }

          } catch (error) {
            console.error('ステータスチェックエラー:', error)
          }
        }, 5000) // 5秒間隔でチェック

        // クライアント切断時のクリーンアップ
        request.signal.addEventListener('abort', () => {
          clearInterval(statusCheckInterval)
          controller.close()
        })

        // 期限切れタイマー
        const timeoutMs = payment.expireAt.getTime() - new Date().getTime()
        if (timeoutMs > 0) {
          setTimeout(() => {
            clearInterval(statusCheckInterval)
            controller.enqueue(`data: ${JSON.stringify({
              status: 'expired',
              message: '決済期限が切れました'
            })}\n\n`)
            controller.close()
          }, timeoutMs)
        }      }
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

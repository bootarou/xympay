import { NextRequest } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'

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
          message: '決済は既に完了しています'
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
    }

    const stream = new ReadableStream({
      start(controller) {
        const initialData = {
          status: payment.status,
          amount: payment.amount,
          recipientAddress: payment.address.address,
          expireAt: payment.expireAt.toISOString(),
          productName: payment.product.name
        }
        
        controller.enqueue(`data: ${JSON.stringify(initialData)}\n\n`)

        const cleanup = () => {
          controller.close()
        }

        request.signal.addEventListener('abort', cleanup)
        
        setTimeout(cleanup, 300000) // 5分でタイムアウト
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

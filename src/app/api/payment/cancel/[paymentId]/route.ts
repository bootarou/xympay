import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../../lib/auth' 
import { prisma } from '../../../../../../lib/prisma'

/**
 * 決済キャンセルAPI
 * POST /api/payment/cancel/[paymentId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params

  try {
    console.log('決済キャンセル要求:', paymentId)

    // 決済情報を取得（paymentIdで検索）
    const payment = await prisma.payment.findUnique({
      where: { paymentId: paymentId },
      include: {
        product: true,
        user: true
      }
    })

    if (!payment) {
      return Response.json(
        { error: '決済情報が見つかりません' },
        { status: 404 }
      )
    }

    // 認証チェック（ログインユーザーの場合のみ所有者確認）
    const session = await getServerSession(authOptions)
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      
      // ログインユーザーの場合は所有者チェック
      if (user && payment.userId && payment.userId !== user.id) {
        return Response.json(
          { error: 'この決済をキャンセルする権限がありません' },
          { status: 403 }
        )
      }
    }

    // キャンセル可能な状態かチェック
    if (payment.status !== 'pending') {
      return Response.json(
        { 
          error: payment.status === 'cancelled' ? 
            '既にキャンセルされた決済です' : 
            'この決済はキャンセルできません'
        },
        { status: 400 }
      )
    }

    // 決済をキャンセル状態に更新
    const updatedPayment = await prisma.payment.update({
      where: { paymentId: paymentId },
      data: { 
        status: 'cancelled',
        cancelledAt: new Date()
      }
    })

    // 在庫ロックを解除
    await prisma.productLock.deleteMany({
      where: { paymentId: paymentId }
    })

    console.log('決済キャンセル完了:', {
      paymentId: updatedPayment.paymentId,
      status: updatedPayment.status,
      productName: payment.product.name
    })

    return Response.json({
      success: true,
      message: '決済がキャンセルされました',
      payment: {
        paymentId: updatedPayment.paymentId,
        status: updatedPayment.status,
        cancelledAt: updatedPayment.cancelledAt?.toISOString()
      }
    })

  } catch (error) {
    console.error('決済キャンセルエラー:', error)
    return Response.json(
      { error: '決済のキャンセルに失敗しました' },
      { status: 500 }
    )
  }
}

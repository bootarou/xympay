import { NextRequest } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'

/**
 * 決済のフォームデータ更新API
 * PUT /api/payment/form/[paymentId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params

  console.log('=== 決済フォームデータ更新API呼び出し開始 ===')
  console.log('paymentId:', paymentId)

  try {
    const { formData } = await request.json()

    console.log('更新するフォームデータ:', formData)

    // 決済情報を取得して存在確認
    const payment = await prisma.payment.findUnique({
      where: { paymentId: paymentId },
      select: {
        id: true,
        status: true
      }
    })

    if (!payment) {
      console.log('決済情報が見つかりません:', paymentId)
      return Response.json(
        { error: '決済情報が見つかりません' },
        { status: 404 }
      )
    }

    // pending状態の決済のみ更新可能
    if (payment.status !== 'pending') {
      console.log('決済の状態が更新可能ではありません:', payment.status)
      return Response.json(
        { error: '決済の状態が更新可能ではありません' },
        { status: 400 }
      )
    }    // フォームデータを更新 + Step2移行時の期限短縮
    const newExpireAt = new Date(Date.now() + 5 * 60 * 1000) // 現在時刻から5分後
    
    const updatedPayment = await prisma.payment.update({
      where: { paymentId: paymentId },
      data: {
        formData: JSON.stringify(formData),
        expireAt: newExpireAt // Step2移行時に期限を5分に短縮
      }
    })

    console.log('フォームデータ更新成功:', updatedPayment.paymentId)
    console.log('決済期限を5分に短縮:', newExpireAt)

    return Response.json({
      success: true,
      paymentId: updatedPayment.paymentId,
      message: 'フォームデータが更新されました'
    })

  } catch (error) {
    console.error('フォームデータ更新エラー:', error)
    return Response.json(
      { error: 'フォームデータの更新に失敗しました' },
      { status: 500 }
    )
  }
}

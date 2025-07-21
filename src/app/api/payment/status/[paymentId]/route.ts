import { NextRequest } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { calculateRemainingTime } from '../../../../../lib/symbol/payment'
import { symbolMonitor } from '../../../../../lib/symbol/monitor'
import { paymentMonitorService } from '../../../../../lib/payment/monitor-service'

/**
 * 決済状況取得API
 * GET /api/payment/status/[paymentId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params
  console.log('=== 決済状況取得API呼び出し開始 ===')
  console.log('paymentId:', paymentId)
  console.log('Request URL:', request.url)

  try {
    // 決済情報を取得
    let payment = await prisma.payment.findUnique({
      where: { paymentId: paymentId }, // idではなくpaymentIdで検索
      include: {
        product: {
          select: {
            id: true,
            uuid: true,
            name: true,
            price: true,            customFields: {
              select: {
                id: true,
                fieldName: true,
                fieldType: true,
                isRequired: true,
                options: true
              }
            }
          }
        },
        address: {
          select: {
            address: true
          }
        }
      }
    })

    console.log('=== 決済情報検索結果 (status) ===')
    console.log('検索キー paymentId:', paymentId)
    console.log('検索結果:', payment ? '見つかりました' : '見つかりませんでした')
    if (payment) {
      console.log('決済ID:', payment.paymentId)
      console.log('決済状況:', payment.status)
      console.log('商品名:', payment.product.name)
    }

    if (!payment) {
      console.log('決済情報が見つかりません:', paymentId)
      return Response.json(
        { error: '決済情報が見つかりません' },
        { status: 404 }
      )
    }

    // 決済がpendingの場合、その場でSymbol取引をチェック
    if (payment.status === 'pending') {
      console.log('=== Status API: pending決済のSymbol取引チェック ===')
      try {
        const transaction = await symbolMonitor.checkConfirmedTransactions(
          payment.address.address,
          payment.paymentId,
          Number(payment.amount)
        )

        if (transaction) {
          console.log('✅ Status API: 取引を検知しました！')
          console.log('取引詳細:', {
            hash: transaction.transactionId,
            amount: transaction.amount,
            message: transaction.message,
            sender: transaction.senderAddress
          })

          // DBを更新
          const updatedPayment = await prisma.payment.update({
            where: { paymentId: paymentId },
            data: {
              status: 'confirmed',
              transactionId: transaction.transactionId,
              senderAddress: transaction.senderAddress,
              confirmedAt: new Date()
            },
            include: {
              product: {
                select: {
                  id: true,
                  uuid: true,
                  name: true,
                  price: true,
                  customFields: {
                    select: {
                      id: true,
                      fieldName: true,
                      fieldType: true,
                      isRequired: true,
                      options: true
                    }
                  }
                }
              },
              address: {
                select: {
                  address: true
                }
              }
            }
          })

          // バックグラウンド監視から削除
          paymentMonitorService.removePaymentFromMonitoring(paymentId)

          // 更新された決済情報を使用
          payment = updatedPayment
        } else {
          console.log('Status API: 該当する取引は見つかりませんでした')
          
          // バックグラウンド監視に追加（まだ監視されていない場合）
          paymentMonitorService.addPaymentToMonitoring({
            paymentId: payment.paymentId,
            addressId: payment.addressId,
            address: payment.address.address,
            amount: Number(payment.amount),
            expireAt: payment.expireAt
          })
        }
      } catch (symbolError) {
        console.error('Symbol取引チェックエラー:', symbolError)
        // エラーが発生してもStatus APIは継続
      }
    }

    // 残り時間を計算
    const remainingTime = calculateRemainingTime(payment.expireAt)    // 期限切れの場合、DBの状態を更新
    if (remainingTime.isExpired && payment.status === 'pending') {
      await prisma.payment.update({
        where: { paymentId: paymentId },
        data: { status: 'expired' }
      })

      // 在庫ロックを解除
      await prisma.productLock.deleteMany({
        where: { paymentId: paymentId }
      })
    }    // レスポンスデータを構築
    const responseData = {
      paymentId: payment.paymentId,
      status: remainingTime.isExpired && payment.status === 'pending' ? 'expired' : payment.status,
      amount: payment.amount,
      recipientAddress: payment.address.address,
      expireAt: payment.expireAt.toISOString(),
      remainingTime: {
        totalSeconds: remainingTime.totalSeconds,
        minutes: remainingTime.minutes,
        seconds: remainingTime.seconds,
        isExpired: remainingTime.isExpired
      },
      product: {
        id: payment.product.id,
        uuid: payment.product.uuid,
        name: payment.product.name,
        price: payment.product.price,        customFields: payment.product.customFields.map(field => ({
          id: field.id,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          options: field.options ? JSON.parse(field.options) : null
        }))
      },
      formData: (() => {
        try {
          return payment.formData ? 
            (typeof payment.formData === 'string' ? JSON.parse(payment.formData) : payment.formData) 
            : {};
        } catch (error) {
          console.error('formData JSONパースエラー:', error);
          return {};
        }
      })(),
      transactionId: payment.transactionId,
      confirmedAt: payment.confirmedAt?.toISOString() || null,
      createdAt: payment.createdAt.toISOString(),
      // 為替レート情報を追加
      exchangeRate: payment.exchangeRate ? Number(payment.exchangeRate) : null,
      baseCurrency: payment.baseCurrency || null,
      baseCurrencyAmount: payment.baseCurrencyAmount ? Number(payment.baseCurrencyAmount) : null,
      rateProvider: payment.rateProvider || null,
      rateTimestamp: payment.rateTimestamp?.toISOString() || null
    }

    return Response.json(responseData)

  } catch (error) {
    console.error('決済状況取得エラー:', error)
    return Response.json(
      { error: '決済状況を取得できませんでした' },
      { status: 500 }
    )
  }
}

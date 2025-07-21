import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // 取引詳細を取得（関連する商品とカスタムフィールドも含む）
    const payment = await prisma.payment.findUnique({
      where: {
        paymentId: paymentId
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: {
                order: 'asc'
              }
            },
            customFields: {
              orderBy: {
                id: 'asc'
              }
            }
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // レスポンスデータを整形
    let formData = {};
    
    // formDataがstring型の場合はJSONパースを試行
    if (payment.formData) {
      if (typeof payment.formData === 'string') {
        try {
          formData = JSON.parse(payment.formData);
        } catch (e) {
          console.error('Failed to parse formData as JSON:', e);
          formData = { rawData: payment.formData };
        }
      } else {
        formData = payment.formData;
      }
    }
    
    const transactionDetail = {
      id: payment.id,
      paymentId: payment.paymentId,
      amount: payment.amount,
      status: payment.status,
      transactionId: payment.transactionId,
      senderAddress: payment.senderAddress,
      confirmedAt: payment.confirmedAt,
      createdAt: payment.createdAt,
      formData: formData,
      // 為替レート情報を追加
      exchangeRate: payment.exchangeRate,
      baseCurrency: payment.baseCurrency,
      baseCurrencyAmount: payment.baseCurrencyAmount,
      rateProvider: payment.rateProvider,
      rateTimestamp: payment.rateTimestamp,
      product: {
        id: payment.product.id,
        uuid: payment.product.uuid,
        name: payment.product.name,
        price: payment.product.price,
        description: payment.product.description,
        images: payment.product.images.map(img => ({
          id: img.id,
          url: img.url,
          order: img.order
        })),
        customFields: payment.product.customFields.map(field => ({
          id: field.id,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          options: field.options
        }))
      }
    }

    return NextResponse.json(transactionDetail)

  } catch (error) {
    console.error('Error fetching transaction detail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transaction detail' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

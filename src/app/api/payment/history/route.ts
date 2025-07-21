import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'

/**
 * 決済履歴取得API
 * GET /api/payment/history
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return Response.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // クエリパラメータの取得
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const productId = searchParams.get('productId')

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return Response.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // フィルター条件を構築
    const where: any = {
      userId: user.id
    }

    if (status) {
      where.status = status
    }

    if (productId) {
      where.productId = productId
    }

    // 決済履歴を取得
    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true
            }
          },
          address: {
            select: {
              address: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.payment.count({ where })
    ])

    // レスポンスデータを構築
    const responseData = {
      payments: payments.map(payment => ({
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        recipientAddress: payment.address.address,
        transactionId: payment.transactionId,
        product: payment.product,
        createdAt: payment.createdAt.toISOString(),
        confirmedAt: payment.confirmedAt?.toISOString() || null,
        expireAt: payment.expireAt.toISOString()
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    }

    return Response.json(responseData)

  } catch (error) {
    console.error('決済履歴取得エラー:', error)
    return Response.json(
      { error: '決済履歴を取得できませんでした' },
      { status: 500 }
    )
  }
}

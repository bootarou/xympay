import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"
import { generatePaymentId, calculatePaymentExpiry } from "../../../../lib/symbol/config"
import { paymentMonitorService } from "../../../../lib/payment/monitor-service"

// POST /api/payment/lock - 在庫をロックして決済を開始
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { productId, formData } = body

    if (!productId) {
      return NextResponse.json(
        { error: "商品IDが必要です" },
        { status: 400 }
      )
    }

    // セッションIDを生成（認証済みの場合はユーザーID、未認証はランダム）
    const sessionId = session?.user?.id || `guest_${Math.random().toString(36).substr(2, 9)}`
    const paymentId = generatePaymentId()
    const expireAt = calculatePaymentExpiry()

    // トランザクション実行
    const result = await prisma.$transaction(async (tx) => {
      // 期限切れのロックを削除
      await tx.productLock.deleteMany({
        where: {
          expireAt: {
            lt: new Date()
          }
        }
      })

      // 商品情報を取得（排他ロック）
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: {
          user: {
            select: {
              addresses: {
                where: { isDefault: true },
                take: 1
              }
            }
          }
        }
      })

      if (!product) {
        throw new Error("商品が見つかりません")
      }

      // 販売期間チェック
      const now = new Date()
      if (product.saleStartDate && now < product.saleStartDate) {
        throw new Error("販売期間前です")
      }

      if (product.saleEndDate && now > product.saleEndDate) {
        throw new Error("販売期間終了しました")
      }

      // 在庫チェック
      if (product.stock <= 0) {
        throw new Error("在庫がありません")
      }

      // 現在のロック数を確認
      const lockCount = await tx.productLock.count({
        where: {
          productId: productId,
          expireAt: {
            gt: new Date()
          }
        }
      })

      if (lockCount >= product.stock) {
        throw new Error("在庫がロック中です")
      }

      // 既存のロックを確認・更新、または新規作成
      const existingLock = await tx.productLock.findUnique({
        where: {
          productId_sessionId: {
            productId: productId,
            sessionId: sessionId
          }
        }
      })

      if (existingLock) {
        // 既存のロックを更新
        await tx.productLock.update({
          where: {
            id: existingLock.id
          },
          data: {
            paymentId: paymentId,
            expireAt: expireAt
          }
        })
      } else {
        // 新規ロックを作成
        await tx.productLock.create({
          data: {
            productId: productId,
            sessionId: sessionId,
            paymentId: paymentId,
            expireAt: expireAt
          }
        })
      }      // 決済レコードを作成
      // まず、商品の販売者のデフォルトアドレスを取得
      const defaultAddress = await tx.address.findFirst({
        where: {
          userId: product.userId,
          isDefault: true
        }
      })

      if (!defaultAddress) {
        throw new Error("販売者の受信アドレスが設定されていません")
      }

      const payment = await tx.payment.create({        data: {
          paymentId: paymentId,
          productId: productId,
          userId: session?.user?.id || null,
          addressId: defaultAddress.id,
          amount: Math.round(Number(product.price) * 1000000), // XYMをμXYMに変換
          status: "pending",
          expireAt: expireAt,
          formData: formData || null
        }
      });

      // バックグラウンド監視サービスに追加
      paymentMonitorService.addPaymentToMonitoring({
        paymentId: payment.paymentId,
        addressId: defaultAddress.id,
        address: defaultAddress.address,
        amount: Math.round(Number(product.price) * 1000000),
        expireAt: expireAt
      });

      return {
        paymentId: payment.paymentId,
        productName: product.name,
        amount: Math.round(Number(product.price) * 1000000), // μXYM単位で返す
        recipientAddress: defaultAddress.address,
        addressId: defaultAddress.id,
        expireAt: payment.expireAt
      }
    })    // バックグラウンド監視に追加
    paymentMonitorService.addPaymentToMonitoring({
      paymentId: result.paymentId,
      addressId: result.addressId,
      address: result.recipientAddress,
      amount: result.amount,
      expireAt: result.expireAt
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("在庫ロックエラー:", error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "在庫ロックに失敗しました" },
      { status: 500 }
    )
  }
}

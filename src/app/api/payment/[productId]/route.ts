import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { createPaymentData } from "../../../../lib/symbol/payment"
import { symbolConfig } from "../../../../lib/symbol/config"
import { exchangeRateManager } from "../../../../lib/exchange-rate"
import { randomUUID } from "crypto"

// GET /api/payment/[productId] - 商品の決済情報を取得（productIdはuuid）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params // productIdは実際にはuuid
    const session = await getServerSession(authOptions)

    // 商品情報をuuidで取得
    const product = await prisma.product.findUnique({
      where: { uuid: productId },
      include: {
        customFields: true,
        images: true,
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
      return NextResponse.json(
        { error: "商品が見つかりません" },
        { status: 404 }
      )
    }

    // 販売期間チェック
    const now = new Date()
    if (product.saleStartDate && now < product.saleStartDate) {
      return NextResponse.json(
        { error: "販売期間前です", code: "BEFORE_SALE_PERIOD" },
        { status: 400 }
      )
    }

    if (product.saleEndDate && now > product.saleEndDate) {
      return NextResponse.json(
        { error: "販売期間終了しました", code: "AFTER_SALE_PERIOD" },
        { status: 400 }
      )
    }

    // 在庫チェック
    if (product.stock <= 0) {
      return NextResponse.json(
        { error: "在庫がありません", code: "OUT_OF_STOCK" },
        { status: 400 }
      )
    }    // 現在のロック数を確認（内部IDを使用）
    const lockCount = await prisma.productLock.count({
      where: {
        productId: product.id,
        expireAt: {
          gt: new Date()
        }
      }
    })

    const availableStock = product.stock - lockCount
    if (availableStock <= 0) {
      return NextResponse.json(
        { error: "現在他のお客様が手続き中です", code: "LOCKED" },
        { status: 400 }
      )
    }

    // デフォルトアドレスを取得
    const defaultAddress = product.user.addresses[0]?.address || product.paymentAddress

    // レスポンス用のデータを整形
    const responseData = {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      stock: availableStock,
      paymentAddress: defaultAddress,
      customFields: product.customFields.map(field => ({
        label: field.fieldName,
        type: field.fieldType,
        required: field.isRequired,
        options: field.options ? JSON.parse(field.options) : undefined
      })),
      images: product.images.map(img => ({
        url: img.url,
        filename: img.filename
      }))
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("商品情報取得エラー:", error)
    return NextResponse.json(
      { error: "商品情報の取得に失敗しました" },
      { status: 500 }
    )
  }
}

// POST /api/payment/[productId] - 決済を作成（productIdはuuid）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params // productIdは実際にはuuid
    const session = await getServerSession(authOptions)
    const { formData } = await request.json()

    // 商品情報をuuidで取得
    const product = await prisma.product.findUnique({
      where: { uuid: productId },
      include: {
        user: {
          select: {
            id: true,
            addresses: {
              where: { isDefault: true },
              take: 1
            },
            settings: {
              select: {
                baseCurrency: true,
                currencySettings: true
              }
            }
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: "商品が見つかりません" },
        { status: 404 }
      )
    }

    // 販売期間チェック
    const now = new Date()
    if (product.saleStartDate && now < product.saleStartDate) {
      return NextResponse.json(
        { error: "販売期間前です", code: "BEFORE_SALE_PERIOD" },
        { status: 400 }
      )
    }

    if (product.saleEndDate && now > product.saleEndDate) {
      return NextResponse.json(
        { error: "販売期間終了しました", code: "AFTER_SALE_PERIOD" },
        { status: 400 }
      )
    }

    // 在庫チェック
    if (product.stock <= 0) {
      return NextResponse.json(
        { error: "在庫がありません", code: "OUT_OF_STOCK" },
        { status: 400 }
      )
    }

    // 現在のロック数を確認（内部IDを使用）
    const lockCount = await prisma.productLock.count({
      where: {
        productId: product.id,
        expireAt: {
          gt: new Date()
        }
      }
    })

    const availableStock = product.stock - lockCount
    if (availableStock <= 0) {
      return NextResponse.json(
        { error: "現在他のお客様が手続き中です", code: "LOCKED" },
        { status: 400 }
      )    }    // セッションIDを生成
    const sessionId = session?.user?.id || `guest_${Date.now()}_${Math.random()}`

    // 決済IDを生成（8桁のランダム英数字）
    const generateShortPaymentId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let result = ''
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }
    const paymentId = generateShortPaymentId()// デフォルトアドレスを取得
    const userAddress = product.user.addresses[0]
    const defaultAddress = userAddress?.address || product.paymentAddress

    console.log('アドレス確認:', {
      productId: product.id,
      productUuid: product.uuid,
      userAddresses: product.user.addresses,
      userAddress: userAddress,
      defaultAddress: defaultAddress,
      paymentAddress: product.paymentAddress
    })

    if (!defaultAddress) {
      console.error('決済アドレス設定エラー:', {
        productId: product.id,
        userId: product.userId,
        userAddressCount: product.user.addresses.length,
        paymentAddress: product.paymentAddress
      })
      return NextResponse.json(
        { error: "決済アドレスが設定されていません" },
        { status: 400 }
      )
    }

    // 決済データ作成（価格の単位を判定して適切に変換）
    const priceInXym = Number(product.price)
    let priceInMicroXym: number
    
    // 商品価格が既にマイクロXYM単位（1000000以上）かXYM単位かを判定
    if (priceInXym >= 1000000) {
      // 既にマイクロXYM単位と推定（そのまま使用）
      priceInMicroXym = Math.round(priceInXym)
      console.log('価格単位判定: 既にμXYM単位と推定', { priceInXym, priceInMicroXym })
    } else {
      // XYM単位と推定（1000000倍してマイクロXYM単位に変換）
      priceInMicroXym = Math.round(priceInXym * 1000000)
      console.log('価格単位判定: XYM単位と推定', { priceInXym, priceInMicroXym })
    }
    
    const paymentData = createPaymentData(
      paymentId,
      product.id, // 内部IDを使用
      defaultAddress,
      priceInMicroXym,
      formData
    )

    // ユーザーの通貨設定を取得（デフォルト: JPY）
    const userSettings = product.user.settings
    const baseCurrency = userSettings?.baseCurrency || 'JPY'
    
    // 為替レート取得
    let exchangeRateData = null
    let baseCurrencyAmount = null
    let rateProvider = null
    let rateTimestamp = null
    
    try {
      console.log(`為替レート取得開始: XYM → ${baseCurrency}`)
      const rateResult = await exchangeRateManager.getRate('XYM', baseCurrency)
      
      if (rateResult && rateResult.rate) {
        const priceInXymForRate = priceInMicroXym / 1000000 // μXYM → XYM
        exchangeRateData = rateResult.rate
        baseCurrencyAmount = priceInXymForRate * rateResult.rate
        rateProvider = rateResult.provider
        rateTimestamp = new Date()
        
        console.log('為替レート取得成功:', {
          rate: exchangeRateData,
          priceInXym: priceInXymForRate,
          baseCurrencyAmount: baseCurrencyAmount,
          baseCurrency: baseCurrency,
          provider: rateProvider
        })
      }
    } catch (error) {
      console.warn('為替レート取得失敗:', error)
      // レート取得失敗時もそのまま処理を続行
    }    // データベースに保存
    const addressId = userAddress?.id
    console.log('アドレスID確認:', {
      userAddress: userAddress,
      addressId: addressId,
      productUserAddresses: product.user.addresses
    })

    if (!addressId) {
      console.error('アドレスID取得エラー:', {
        productId: product.id,
        userId: product.userId,
        userAddresses: product.user.addresses,
        userAddress: userAddress
      })
      return NextResponse.json(
        { error: "ユーザーに受信アドレスが設定されていません" },
        { status: 400 }
      )
    }

    const payment = await prisma.payment.create({
      data: {
        paymentId: paymentData.paymentId,
        productId: product.id,
        userId: session?.user?.id || null,
        addressId: addressId,
        amount: paymentData.amount,
        status: 'pending',
        expireAt: paymentData.expireAt,
        formData: paymentData.formData,
        // 為替レート情報を追加
        exchangeRate: exchangeRateData,
        baseCurrency: baseCurrency,
        baseCurrencyAmount: baseCurrencyAmount,
        rateProvider: rateProvider,
        rateTimestamp: rateTimestamp
      }
    })

    console.log('決済作成成功:', {
      paymentId: paymentData.paymentId,
      productId: product.id,
      productUuid: product.uuid,
      addressId: addressId,
      userAddress: userAddress?.address,
      defaultAddress: defaultAddress
    })

    // 在庫ロック（重複を防ぐためupsertを使用）
    const expireAt = new Date(Date.now() + symbolConfig.paymentExpiryMinutes * 60 * 1000)
    await prisma.productLock.upsert({
      where: {
        productId_sessionId: {
          productId: product.id,
          sessionId
        }
      },
      update: {
        paymentId: paymentData.paymentId,
        expireAt
      },
      create: {
        productId: product.id,
        sessionId,
        paymentId: paymentData.paymentId,
        expireAt
      }
    })

    return NextResponse.json({
      paymentId: paymentData.paymentId,
      redirectUrl: `/payment/${paymentData.paymentId}`
    })
  } catch (error) {
    console.error("決済作成エラー:", error)
    return NextResponse.json(
      { error: "決済の作成に失敗しました" },
      { status: 500 }
    )
  }
}

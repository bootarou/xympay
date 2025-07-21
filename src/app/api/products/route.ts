import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

// 商品一覧取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      )
    }

    const products = await prisma.product.findMany({
      where: { userId: user.id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        customFields: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error("商品取得エラー:", error)
    return NextResponse.json(
      { error: "商品情報の取得に失敗しました" },
      { status: 500 }
    )
  }
}

// 商品登録
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    
    const name = formData.get('name') as string
    const price = formData.get('price') as string
    const paymentAddress = formData.get('paymentAddress') as string
    const stock = formData.get('stock') as string
    const saleStartDate = formData.get('saleStartDate') as string
    const saleEndDate = formData.get('saleEndDate') as string
    const description = formData.get('description') as string
    const callbackUrl = formData.get('callbackUrl') as string
    const customFieldsJson = formData.get('customFields') as string

    // バリデーション
    if (!name || !price) {
      return NextResponse.json(
        { error: "商品名と価格は必須です" },
        { status: 400 }
      )
    }

    // 商品を作成
    const product = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        paymentAddress: paymentAddress || null,
        stock: stock ? parseInt(stock) : 0,
        saleStartDate: saleStartDate ? new Date(saleStartDate) : null,
        saleEndDate: saleEndDate ? new Date(saleEndDate) : null,
        description: description || null,
        callbackUrl: callbackUrl || null,
        userId: user.id,
      },
    })

    // 画像ファイルの処理
    const imageFiles: File[] = []
    for (let i = 0; i < 5; i++) {
      const file = formData.get(`image_${i}`) as File
      if (file && file.size > 0) {
        imageFiles.push(file)
      }
    }

    // 画像保存ディレクトリを作成
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
    }

    // 画像ファイルを保存
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      // ファイル名を生成
      const extension = file.name.split('.').pop()
      const filename = `${product.id}_${i}.${extension}`
      const filepath = path.join(uploadDir, filename)
      
      await writeFile(filepath, buffer)
      
      // データベースに画像情報を保存
      await prisma.productImage.create({
        data: {
          productId: product.id,
          filename,
          url: `/uploads/products/${filename}`,
          order: i,
        },
      })
    }

    // カスタムフィールドの処理
    if (customFieldsJson) {
      try {
        const customFields = JSON.parse(customFieldsJson)
        for (const field of customFields) {
          if (field.fieldName && field.fieldType) {
            await prisma.productCustomField.create({
              data: {
                productId: product.id,
                fieldName: field.fieldName,
                fieldType: field.fieldType,
                isRequired: field.isRequired || false,
                options: field.options ? JSON.stringify(field.options) : null,
              },
            })
          }
        }
      } catch (error) {
        console.error("カスタムフィールド処理エラー:", error)
      }
    }

    // 作成された商品を関連データと共に取得
    const createdProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        customFields: true,
      },
    })

    return NextResponse.json({
      message: "商品が正常に登録されました",
      product: createdProduct,
    })
  } catch (error) {
    console.error("商品登録エラー:", error)
    return NextResponse.json(
      { error: "商品登録に失敗しました" },
      { status: 500 }
    )
  }
}

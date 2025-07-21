import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { writeFile, mkdir, unlink } from "fs/promises"
import path from "path"

// 商品詳細取得
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await context.params
    
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
    }    const product = await prisma.product.findFirst({
      where: { 
        id: id,
        userId: user.id // 自分の商品のみ取得可能
      },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        customFields: true,
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: "商品が見つかりません" },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("商品取得エラー:", error)
    return NextResponse.json(
      { error: "商品情報の取得に失敗しました" },
      { status: 500 }
    )
  }
}

// 商品更新
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await context.params
    
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
    }    // 既存商品の確認
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id: id,
        userId: user.id
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: "商品が見つかりません" },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    
    // 基本データの取得
    const name = formData.get("name") as string
    const price = parseFloat(formData.get("price") as string)
    const paymentAddress = formData.get("paymentAddress") as string || null
    const stock = parseInt(formData.get("stock") as string) || 0
    const saleStartDate = formData.get("saleStartDate") as string || null
    const saleEndDate = formData.get("saleEndDate") as string || null
    const description = formData.get("description") as string || null
    const callbackUrl = formData.get("callbackUrl") as string || null
    const customFieldsData = formData.get("customFields") as string
    const imagesToDeleteData = formData.get("imagesToDelete") as string

    // バリデーション
    if (!name || isNaN(price)) {
      return NextResponse.json(
        { error: "商品名と有効な価格は必須です" },
        { status: 400 }
      )
    }

    // 削除する画像を処理
    const imagesToDelete = imagesToDeleteData ? JSON.parse(imagesToDeleteData) : []
    
    if (imagesToDelete.length > 0) {
      // ファイルシステムから画像ファイルを削除
      for (const imageId of imagesToDelete) {
        try {
          const imageToDelete = await prisma.productImage.findUnique({
            where: { id: imageId }
          })
          
          if (imageToDelete) {
            const filePath = path.join(process.cwd(), "public", imageToDelete.url)
            await unlink(filePath)
          }
        } catch (error) {
          console.error("画像ファイル削除エラー:", error)
          // ファイル削除エラーは続行（DBからは削除する）
        }
      }

      // データベースから画像を削除
      await prisma.productImage.deleteMany({
        where: {
          id: { in: imagesToDelete },
          product: { userId: user.id } // セキュリティチェック
        }
      })
    }

    // 新しい画像を処理
    const uploadDir = path.join(process.cwd(), "public", "uploads", "products")
    await mkdir(uploadDir, { recursive: true })

    const newImageEntries: Array<{ url: string; order: number }> = []    // 既存画像の最大orderを取得
    const existingImages = await prisma.productImage.findMany({
      where: { productId: id },
      orderBy: { order: 'desc' },
      take: 1
    })
    
    let nextOrder = existingImages.length > 0 ? existingImages[0].order + 1 : 0

    // 新しい画像を保存
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("new_image_") && value instanceof File) {
        const file = value as File
        const timestamp = Date.now()
        const filename = `${timestamp}_${file.name}`
        const filepath = path.join(uploadDir, filename)
        
        const bytes = await file.arrayBuffer()
        await writeFile(filepath, Buffer.from(bytes))
        
        newImageEntries.push({
          url: `/uploads/products/${filename}`,
          order: nextOrder++
        })
      }
    }

    // カスタムフィールドを処理
    const customFields = customFieldsData ? JSON.parse(customFieldsData) : []

    // データベースでの更新処理
    const updatedProduct = await prisma.$transaction(async (prisma) => {      // 商品基本情報を更新
      const product = await prisma.product.update({
        where: { id: id },
        data: {
          name,
          price,
          paymentAddress,
          stock,
          saleStartDate: saleStartDate ? new Date(saleStartDate) : null,
          saleEndDate: saleEndDate ? new Date(saleEndDate) : null,
          description,
          callbackUrl,
        }
      })      // 新しい画像を追加
      if (newImageEntries.length > 0) {        await prisma.productImage.createMany({
          data: newImageEntries.map(img => ({
            productId: id,
            url: img.url,
            filename: img.url.split('/').pop() || 'image',
            order: img.order
          }))
        })
      }      // 既存のカスタムフィールドを削除して新しいものを作成
      await prisma.productCustomField.deleteMany({
        where: { productId: id }
      })

      if (customFields.length > 0) {
        await prisma.productCustomField.createMany({
          data: customFields.map((field: any) => ({
            productId: id,
            fieldName: field.fieldName,
            fieldType: field.fieldType,
            isRequired: field.isRequired || false,
            options: field.options ? JSON.stringify(field.options) : null
          }))
        })
      }      return product
    })

    // 更新された商品にカスタムフィールドを含めて取得
    const productWithFields = await prisma.product.findUnique({
      where: { id: id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        customFields: true
      }
    })

    return NextResponse.json({
      message: "商品が正常に更新されました",
      product: productWithFields
    })

  } catch (error) {
    console.error("商品更新エラー:", error)
    return NextResponse.json(
      { error: "商品の更新に失敗しました" },
      { status: 500 }
    )
  }
}

// 商品削除
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await context.params
    
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
    }    // 商品の存在確認
    const product = await prisma.product.findFirst({
      where: { 
        id: id,
        userId: user.id
      },
      include: {
        images: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: "商品が見つかりません" },
        { status: 404 }
      )
    }

    // 画像ファイルを削除
    for (const image of product.images) {
      try {
        const filePath = path.join(process.cwd(), "public", image.url)
        await unlink(filePath)
      } catch (error) {
        console.error("画像ファイル削除エラー:", error)
        // ファイル削除エラーは続行
      }
    }    // データベースから商品を削除（関連データも CASCADE で削除される）
    await prisma.product.delete({
      where: { id: id }
    })

    return NextResponse.json({
      message: "商品が正常に削除されました"
    })

  } catch (error) {
    console.error("商品削除エラー:", error)
    return NextResponse.json(
      { error: "商品の削除に失敗しました" },
      { status: 500 }
    )
  }
}

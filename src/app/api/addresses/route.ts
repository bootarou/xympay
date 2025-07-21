import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../lib/prisma"

// GET /api/addresses - ユーザーのアドレス一覧を取得
export async function GET(request: NextRequest) {  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const addresses = await prisma.address.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
    })

    return NextResponse.json(addresses)
  } catch (error) {
    console.error("アドレス一覧取得エラー:", error)
    return NextResponse.json(
      { error: "アドレス一覧の取得に失敗しました" },
      { status: 500 }
    )
  }
}

// POST /api/addresses - 新しいアドレスを追加
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, type = "other", description, isDefault } = body

    // 入力検証
    if (!name || !address) {
      return NextResponse.json(
        { error: "アドレス名とアドレスは必須です" },
        { status: 400 }
      )
    }

    // Symbolアドレスの基本的な検証（39文字で大文字小文字の英数字）
    if (!/^[A-Z0-9]{39}$/.test(address)) {
      return NextResponse.json(
        { error: "無効なSymbolアドレス形式です" },
        { status: 400 }
      )
    }

    // 既存のアドレスとの重複チェック
    const existingAddress = await prisma.address.findFirst({
      where: {
        userId: session.user.id,
        address: address,
      },
    })

    if (existingAddress) {
      return NextResponse.json(
        { error: "このアドレスは既に登録されています" },
        { status: 400 }
      )
    }

    // デフォルトアドレスに設定する場合、他のデフォルトを解除
    if (isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    const newAddress = await prisma.address.create({
      data: {
        name,
        address,
        type,
        description: description || null,
        isDefault: isDefault || false,
        userId: session.user.id,
      },
    })

    return NextResponse.json(newAddress, { status: 201 })
  } catch (error) {
    console.error("アドレス作成エラー:", error)
    return NextResponse.json(
      { error: "アドレスの作成に失敗しました" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

// GET /api/addresses/[id] - 特定のアドレスを取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const address = await prisma.address.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!address) {
      return NextResponse.json(
        { error: "アドレスが見つかりません" },
        { status: 404 }
      )
    }

    return NextResponse.json(address)
  } catch (error) {
    console.error("アドレス取得エラー:", error)
    return NextResponse.json(
      { error: "アドレスの取得に失敗しました" },
      { status: 500 }
    )
  }
}

// PUT /api/addresses/[id] - アドレスを更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, type, description, isDefault } = body

    // 入力検証
    if (!name || !address) {
      return NextResponse.json(
        { error: "アドレス名とアドレスは必須です" },
        { status: 400 }
      )
    }

    // Symbolアドレスの基本的な検証
    if (!/^[A-Z0-9]{39}$/.test(address)) {
      return NextResponse.json(
        { error: "無効なSymbolアドレス形式です" },
        { status: 400 }
      )
    }

    // 既存のアドレスが存在するか確認
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!existingAddress) {
      return NextResponse.json(
        { error: "アドレスが見つかりません" },
        { status: 404 }
      )
    }

    // 同じアドレス値で他の登録があるかチェック（自分以外）
    const duplicateAddress = await prisma.address.findFirst({
      where: {
        userId: session.user.id,
        address: address,
        NOT: {
          id: id,
        },
      },
    })

    if (duplicateAddress) {
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
          NOT: {
            id: id,
          },
        },
        data: {
          isDefault: false,
        },
      })
    }

    const updatedAddress = await prisma.address.update({
      where: {
        id: id,
      },
      data: {
        name,
        address,
        type: type || "other",
        description: description || null,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json(updatedAddress)
  } catch (error) {
    console.error("アドレス更新エラー:", error)
    return NextResponse.json(
      { error: "アドレスの更新に失敗しました" },
      { status: 500 }
    )
  }
}

// DELETE /api/addresses/[id] - アドレスを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // 既存のアドレスが存在するか確認
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!existingAddress) {
      return NextResponse.json(
        { error: "アドレスが見つかりません" },
        { status: 404 }
      )
    }

    await prisma.address.delete({
      where: {
        id: id,
      },
    })

    return NextResponse.json({ message: "アドレスが削除されました" })
  } catch (error) {
    console.error("アドレス削除エラー:", error)
    return NextResponse.json(
      { error: "アドレスの削除に失敗しました" },
      { status: 500 }
    )
  }
}

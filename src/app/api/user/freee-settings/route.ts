import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: "認証が必要です" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        freeeClientId: true,
        freeeClientSecret: true,
        freeeRedirectUri: true,
      },
    })

    if (!user) {
      return NextResponse.json({ message: "ユーザーが見つかりません" }, { status: 404 })
    }

    // Client Secretは一部をマスク
    const maskedSettings = {
      freeeClientId: user.freeeClientId,
      freeeClientSecret: user.freeeClientSecret 
        ? `${"*".repeat(Math.max(0, user.freeeClientSecret.length - 4))}${user.freeeClientSecret.slice(-4)}`
        : null,
      freeeRedirectUri: user.freeeRedirectUri,
    }

    return NextResponse.json(maskedSettings)
  } catch (error) {
    console.error("freee設定取得エラー:", error)
    return NextResponse.json(
      { message: "設定の取得に失敗しました" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: "認証が必要です" }, { status: 401 })
    }

    const body = await request.json()
    const { freeeClientId, freeeClientSecret, freeeRedirectUri } = body

    // バリデーション
    if (!freeeClientId || !freeeClientSecret || !freeeRedirectUri) {
      return NextResponse.json(
        { message: "必須項目が入力されていません" },
        { status: 400 }
      )
    }

    // URLの形式チェック
    try {
      new URL(freeeRedirectUri)
    } catch {
      return NextResponse.json(
        { message: "リダイレクトURIの形式が正しくありません" },
        { status: 400 }
      )
    }

    // ユーザー設定を更新
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        freeeClientId,
        freeeClientSecret,
        freeeRedirectUri,
      },
    })

    return NextResponse.json({ message: "freee設定を保存しました" })
  } catch (error) {
    console.error("freee設定保存エラー:", error)
    return NextResponse.json(
      { message: "設定の保存に失敗しました" },
      { status: 500 }
    )
  }
}

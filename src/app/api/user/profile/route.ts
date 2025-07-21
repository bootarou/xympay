import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

// プロフィール情報を取得
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
      where: { email: session.user.email },      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        birthDate: true,
        bio: true,
        termsAccepted: true,
        termsAcceptedAt: true,
        privacyAccepted: true,
        privacyAcceptedAt: true,
        commerceAccepted: true,
        commerceAcceptedAt: true,
        userTermsOfService: true,
        userPrivacyPolicy: true,
        userCommerceLaw: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("プロフィール取得エラー:", error)
    return NextResponse.json(
      { error: "プロフィール情報の取得に失敗しました" },
      { status: 500 }
    )
  }
}

// プロフィール情報を更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }    const body = await request.json()
    const {
      name,
      phoneNumber,
      address,
      birthDate,
      bio,
      termsAccepted,
      privacyAccepted,
      commerceAccepted,
      userTermsOfService,
      userPrivacyPolicy,
      userCommerceLaw,
    } = body

    // 現在のユーザー情報を取得
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        termsAccepted: true,
        privacyAccepted: true,
        commerceAccepted: true,
      },
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      )
    }    // 規約同意の日時を設定
    const now = new Date()
    const updateData: any = {
      name,
      phoneNumber: phoneNumber || null,
      address: address || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      bio: bio || null,
      termsAccepted,
      privacyAccepted,
      commerceAccepted,
      userTermsOfService: userTermsOfService || null,
      userPrivacyPolicy: userPrivacyPolicy || null,
      userCommerceLaw: userCommerceLaw || null,
    }

    // 規約同意状況が変更された場合、同意日時を更新
    if (termsAccepted && !currentUser.termsAccepted) {
      updateData.termsAcceptedAt = now
    } else if (!termsAccepted) {
      updateData.termsAcceptedAt = null
    }

    if (privacyAccepted && !currentUser.privacyAccepted) {
      updateData.privacyAcceptedAt = now
    } else if (!privacyAccepted) {
      updateData.privacyAcceptedAt = null
    }

    if (commerceAccepted && !currentUser.commerceAccepted) {
      updateData.commerceAcceptedAt = now
    } else if (!commerceAccepted) {
      updateData.commerceAcceptedAt = null
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,        phoneNumber: true,
        address: true,
        birthDate: true,
        bio: true,
        termsAccepted: true,
        termsAcceptedAt: true,
        privacyAccepted: true,
        privacyAcceptedAt: true,
        commerceAccepted: true,
        commerceAcceptedAt: true,
        userTermsOfService: true,
        userPrivacyPolicy: true,
        userCommerceLaw: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      message: "プロフィールが正常に更新されました",
      user: updatedUser,
    })
  } catch (error) {
    console.error("プロフィール更新エラー:", error)
    return NextResponse.json(
      { error: "プロフィール情報の更新に失敗しました" },
      { status: 500 }
    )
  }
}

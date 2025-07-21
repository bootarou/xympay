import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { notificationService } from '../../../../lib/notification/notification-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type = 'test' } = body

    let result = false

    switch (type) {
      case 'test':
        result = await notificationService.sendTestNotification(session.user.email)
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: result,
      message: result 
        ? 'テスト通知を送信しました' 
        : 'テスト通知の送信に失敗しました。SMTP設定を確認してください。'
    })

  } catch (error) {
    console.error('Notification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const status = notificationService.getServiceStatus()

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        environment: {
          smtpHost: !!process.env.SMTP_HOST,
          smtpUser: !!process.env.SMTP_USER,
          smtpPass: !!process.env.SMTP_PASS,
          smtpPort: process.env.SMTP_PORT || '587'
        }
      }
    })

  } catch (error) {
    console.error('Notification status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

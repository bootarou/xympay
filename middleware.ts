import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // 認証が必要なルートでのミドルウェア処理
    console.log("Auth middleware:", req.nextUrl.pathname)
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // API ルートは認証をスキップ（個別に処理）
        if (req.nextUrl.pathname.startsWith("/api/")) {
          return true
        }
        
        // 認証が必要なページ
        const protectedPaths = ["/dashboard", "/transactions", "/accounting"]
        if (protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
          return !!token
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*", 
    "/accounting/:path*",
    "/api/accounting/:path*"
  ]
}

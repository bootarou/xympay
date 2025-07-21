"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Layout } from "../../../components"
import { useTranslation } from "../../../lib/i18n"

interface UserProfile {
  name: string
  email: string
  phoneNumber: string
  address: string
  birthDate: string
  bio: string
  termsAccepted: boolean
  privacyAccepted: boolean
  commerceAccepted: boolean
  userTermsOfService: string
  userPrivacyPolicy: string
  userCommerceLaw: string
}

export default function ProfileEdit() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
    const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    phoneNumber: "",
    address: "",
    birthDate: "",
    bio: "",
    termsAccepted: false,
    privacyAccepted: false,
    commerceAccepted: false,
    userTermsOfService: "",
    userPrivacyPolicy: "",
    userCommerceLaw: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated" && session?.user) {
      fetchProfile()
    }
  }, [status, session, router])
  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        setProfile({
          name: data.name || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
          address: data.address || "",
          birthDate: data.birthDate ? data.birthDate.split('T')[0] : "",
          bio: data.bio || "",
          termsAccepted: data.termsAccepted || false,
          privacyAccepted: data.privacyAccepted || false,
          commerceAccepted: data.commerceAccepted || false,
          userTermsOfService: data.userTermsOfService || "",
          userPrivacyPolicy: data.userPrivacyPolicy || "",
          userCommerceLaw: data.userCommerceLaw || "",
        })
      }    } catch (error) {
      setError(t("profile.fetchError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },        body: JSON.stringify(profile),
      })

      if (response.ok) {
        setMessage(t("profile.updateSuccess"))
        // セッション情報を更新
        await update()
      } else {
        const data = await response.json()
        setError(data.error || t("profile.updateError"))
      }
    } catch (error) {
      setError(t("profile.processingError"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setProfile(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
    }))
  }
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t("profile.loading")}</div>
      </div>
    )
  }

  if (status === "unauthenticated") {    return null
  }
  return (
    <Layout title={t("profile.title")}>
      <div className="py-4 sm:py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("profile.title")}</h1>              <p className="mt-1 text-sm text-gray-600">
                {t("profile.description")}
              </p>
            </div>

          <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-6 space-y-6">
            {/* 基本情報 */}            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t("profile.basicInfo")}</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    {t("profile.name")}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={profile.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    {t("profile.email")}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profile.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">{t("profile.emailNote")}</p>
                </div>                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                    {t("profile.phoneNumber")}
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={profile.phoneNumber}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={t("profile.phonePlaceholder")}
                  />
                </div>

                <div>
                  <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                    {t("profile.birthDate")}
                  </label>
                  <input
                    type="date"
                    id="birthDate"
                    name="birthDate"
                    value={profile.birthDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  {t("profile.address")}
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={profile.address}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t("profile.addressPlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  {t("profile.bio")}
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={profile.bio}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t("profile.bioPlaceholder")}
                /></div>
            </div>

            {/* ユーザー独自の法的文書 */}            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">{t("profile.legalDocuments")}</h2>
              <p className="text-sm text-gray-600">
                {t("profile.legalDescription")}
              </p>
                <div>
                <label htmlFor="userTermsOfService" className="block text-sm font-medium text-gray-700">
                  {t("profile.userTermsOfService")}
                </label>
                <textarea
                  id="userTermsOfService"
                  name="userTermsOfService"
                  rows={8}
                  value={profile.userTermsOfService}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t("profile.userTermsPlaceholder")}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t("profile.userTermsNote")}
                </p>
              </div>              <div>
                <label htmlFor="userPrivacyPolicy" className="block text-sm font-medium text-gray-700">
                  {t("profile.userPrivacyPolicy")}
                </label>
                <textarea
                  id="userPrivacyPolicy"
                  name="userPrivacyPolicy"
                  rows={8}
                  value={profile.userPrivacyPolicy}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t("profile.userPrivacyPlaceholder")}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t("profile.userPrivacyNote")}
                </p>
              </div>              <div>
                <label htmlFor="userCommerceLaw" className="block text-sm font-medium text-gray-700">
                  {t("profile.userCommerceLaw")}
                </label>
                <textarea
                  id="userCommerceLaw"
                  name="userCommerceLaw"
                  rows={8}
                  value={profile.userCommerceLaw}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t("profile.userCommercePlaceholder")}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t("profile.userCommerceNote")}
                </p>
              </div>
            </div>

            {/* 規約・ポリシー */}            <div style={{ display: 'none' }} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">{t("profile.termsAndPolicies")}</h2>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <input
                    id="termsAccepted"
                    name="termsAccepted"
                    type="checkbox"
                    checked={profile.termsAccepted}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />                  <div className="ml-3">                    <label htmlFor="termsAccepted" className="text-sm font-medium text-gray-700">
                      <a href="/terms" target="_blank" className="text-indigo-600 hover:text-indigo-800 underline">
                        {t("profile.terms")}
                      </a>
                      {t("profile.acceptTerms")}
                    </label>
                    <p className="text-xs text-gray-500">
                      {t("profile.acceptTermsNote")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <input
                    id="privacyAccepted"
                    name="privacyAccepted"
                    type="checkbox"
                    checked={profile.privacyAccepted}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />                  <div className="ml-3">                    <label htmlFor="privacyAccepted" className="text-sm font-medium text-gray-700">
                      <a href="/privacy" target="_blank" className="text-indigo-600 hover:text-indigo-800 underline">
                        {t("profile.privacy")}
                      </a>
                      {t("profile.acceptPrivacy")}
                    </label>
                    <p className="text-xs text-gray-500">
                      {t("profile.acceptPrivacyNote")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <input
                    id="commerceAccepted"
                    name="commerceAccepted"
                    type="checkbox"
                    checked={profile.commerceAccepted}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />                  <div className="ml-3">                    <label htmlFor="commerceAccepted" className="text-sm font-medium text-gray-700">
                      <a href="/commerce" target="_blank" className="text-indigo-600 hover:text-indigo-800 underline">
                        {t("profile.commerce")}
                      </a>
                      {t("profile.acceptCommerce")}
                    </label>
                    <p className="text-xs text-gray-500">
                      {t("profile.acceptCommerceNote")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* メッセージ表示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="text-green-800 text-sm">{message}</div>
              </div>
            )}

            {/* ボタン */}            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {t("profile.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSaving ? t("profile.updating") : t("profile.updateProfile")}
              </button>
            </div>
          </form>
        </div>        </div>
      </div>
    </Layout>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AuthScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showOtpInput, setShowOtpInput] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    if (showOtpInput) {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      })

      if (error) {
        setMessage(error.message)
      } else {
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage("Check your email for the code!")
        setShowOtpInput(true)
      }
    }
    setLoading(false)
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="magic-link" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>

            <TabsContent value="magic-link">
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={showOtpInput}
                  />
                  {showOtpInput && (
                    <Input
                      type="text"
                      placeholder="6-digit code"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      required
                    />
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Loading..." : (showOtpInput ? "Verify Code" : "Send Magic Link")}
                </Button>
                {showOtpInput && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setShowOtpInput(false)
                      setOtp("")
                      setMessage("")
                    }}
                    disabled={loading}
                  >
                    Use a different email
                  </Button>
                )}
              </form>
            </TabsContent>

            <TabsContent value="password">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          {message && <p className="text-sm text-center text-muted-foreground mt-4">{message}</p>}
        </CardContent>
      </Card>
    </div>
  )
}

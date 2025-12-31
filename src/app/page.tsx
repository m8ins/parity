"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dashboard } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

      return () => subscription.unsubscribe()
    }
    checkUser()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return <AuthScreen />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Dashboard user={user} />
    </div>
  )
}

function AuthScreen() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    // Simple magic link login
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      }
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Check your email for the login link!")
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Parity</CardTitle>
          <CardDescription>Sign in to manage your contracts.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending link..." : "Send Magic Link"}
            </Button>
            {message && <p className="text-sm text-center text-muted-foreground">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

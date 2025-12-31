"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function Header() {
    const [user, setUser] = useState<any>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user ?? null)

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null)
            })

            return () => subscription.unsubscribe()
        }
        checkUser()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.refresh()
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container px-4 flex h-14 items-center max-w-full justify-between">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <Link href="/">Parity</Link>
                </div>

                {user && (
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground hidden sm:inline-block">
                            {user.email}
                        </span>
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Logout</span>
                            <span className="sm:hidden">Exit</span>
                        </Button>
                    </div>
                )}
            </div>
        </header>
    )
}

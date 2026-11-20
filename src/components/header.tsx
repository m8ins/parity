"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Lock, LogOut } from "lucide-react"
import { ProfileDialog } from "./profile-dialog"
import type { User } from "@supabase/supabase-js"

export function Header() {
    const [user, setUser] = useState<User | null>(null)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [logoutPending, setLogoutPending] = useState(false)
    const [logoutError, setLogoutError] = useState("")
    const busy = useRef(false)
    const supabase = createClient()

    useEffect(() => {
        let active = true
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (active) setUser(session?.user ?? null)
        })
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (active) setUser(session?.user ?? null)
        })
        return () => { active = false; subscription.unsubscribe() }
    }, [supabase.auth])

    const handleLogout = async () => {
        if (busy.current) return
        busy.current = true; setLogoutPending(true); setLogoutError("")
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            setIsProfileOpen(false)
            setUser(null) // AccountBoundary owns the full session reload.
        } catch { setLogoutError('Abmelden konnte nicht bestätigt werden. Bitte versuche es erneut.') }
        finally { busy.current = false; setLogoutPending(false) }
    }

    return (
        <header className="parity-header">
            <div className="">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <Link href="/">Parity</Link>
                </div>

                {user && (
                    <div className="account-area">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="account-trigger gap-2" aria-label="Konto öffnen">
                                    <span className="text-sm font-normal">
                                        {user.email}
                                    </span>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled={logoutPending} onClick={() => setIsProfileOpen(true)}>
                                    <Lock className="mr-2 h-4 w-4" />
                                    <span>Passwort ändern</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled={logoutPending} onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>{logoutPending ? "Wird abgemeldet …" : "Abmelden"}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {logoutPending && <p role="status" className="text-sm">Wird abgemeldet …</p>}
                        {logoutError && <div className="text-sm" role="alert"><p>{logoutError}</p><Button variant="ghost" disabled={logoutPending} onClick={handleLogout}>Abmelden erneut versuchen</Button></div>}
                        <ProfileDialog key={user.id}
                            open={isProfileOpen}
                            onOpenChange={setIsProfileOpen}
                            showTrigger={false}
                        />
                    </div>
                )}
            </div>
        </header>
    )
}

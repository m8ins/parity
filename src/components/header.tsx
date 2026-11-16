"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
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
    const router = useRouter()
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
        await supabase.auth.signOut()
        router.refresh()
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
                                <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                                    <Lock className="mr-2 h-4 w-4" />
                                    <span>Passwort ändern</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Abmelden</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <ProfileDialog
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

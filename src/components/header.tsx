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

export function Header() {
    const [user, setUser] = useState<any>(null)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="gap-2">
                                    <span className="text-sm font-normal">
                                        {user.email}
                                    </span>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                                    <Lock className="mr-2 h-4 w-4" />
                                    <span>Change Password</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
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

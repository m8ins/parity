"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings } from "lucide-react"

export function ProfileDialog({ open: controlledOpen, onOpenChange: setControlledOpen, showTrigger = true }: { open?: boolean, onOpenChange?: (open: boolean) => void, showTrigger?: boolean }) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined

    const open = isControlled ? controlledOpen : internalOpen
    const onOpenChange = isControlled ? setControlledOpen : setInternalOpen

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")
    const supabase = createClient()

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage("")
        setError("")

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            setLoading(false)
            return
        }

        const { error: updateError } = await supabase.auth.updateUser({
            password: password
        })

        if (updateError) {
            setError(updateError.message)
        } else {
            setMessage("Password updated successfully")
            setPassword("")
            setConfirmPassword("")
            setTimeout(() => onOpenChange?.(false), 1500)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {showTrigger && (
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Settings</span>
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Profile Settings</DialogTitle>
                    <DialogDescription>
                        Update your account settings here.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        {message && <p className="text-sm text-green-500">{message}</p>}
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? "Updating..." : "Update Password"}
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

import { Dashboard } from "@/components/dashboard"
import { AuthScreen } from "@/components/auth-screen"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Meter, MeterData } from "@/lib/types"
import { isMissingSession } from "@/lib/access"
import { loadMeterData } from "@/lib/contracts"

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError && !isMissingSession(authError)) throw authError

  if (!user) {
    return <AuthScreen notice="Bitte melde dich an, um deine Zähler zu öffnen." />
  }

  const { data: metersData, error: metersError } = await supabase
    .from("meters")
    .select("*")
    .order("created_at", { ascending: true })

  if (metersError) throw metersError

  const meters = (metersData as Meter[]) || []

  const initialData: Record<string, MeterData> = {}

  for (const meter of meters) {
    initialData[meter.id] = await loadMeterData(supabase, meter.id)
  }

  return (
    <div className="min-h-screen bg-background">
      <Dashboard key={user.id} user={user} initialMeters={meters} initialData={initialData} />
    </div>
  )
}

import { Dashboard } from "@/components/dashboard"
import { AuthScreen } from "@/components/auth-screen"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Meter, MeterData } from "@/lib/types"
import { loadMeterData } from "@/lib/contracts"

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <AuthScreen />
  }

  const { data: metersData } = await supabase
    .from("meters")
    .select("*")
    .order("created_at", { ascending: true })

  const meters = (metersData as Meter[]) || []

  const initialData: Record<string, MeterData> = {}

  for (const meter of meters) {
    initialData[meter.id] = await loadMeterData(supabase, meter.id)
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950">
      <Dashboard user={user} initialMeters={meters} initialData={initialData} />
    </div>
  )
}

import { Dashboard } from "@/components/dashboard"
import { AuthScreen } from "@/components/auth-screen"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Meter, Contract, Rate, Reading } from "@/lib/types"

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

  const initialData: Record<string, {
    contract: Contract | null
    rates: Rate[]
    readings: Reading[]
  }> = {}

  for (const meter of meters) {
    const contractRes = await supabase
      .from("contracts")
      .select("*")
      .eq("meter_id", meter.id)
      .order("period_start", { ascending: false })
      .limit(1)
      .single()

    const contract = (contractRes.data as Contract) || null

    const [ratesRes, readingsRes] = await Promise.all([
      contract
        ? supabase.from("rates").select("*").eq("contract_id", contract.id).order("effective_from", { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase.from("readings").select("*").eq("meter_id", meter.id).order("date", { ascending: true }),
    ])

    initialData[meter.id] = {
      contract,
      rates: (ratesRes.data as Rate[]) || [],
      readings: (readingsRes.data as Reading[]) || [],
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950">
      <Dashboard user={user} initialMeters={meters} initialData={initialData} />
    </div>
  )
}

import { ContractDetail } from "@/components/contract-detail"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Meter, Contract, Rate, Reading } from "@/lib/types"

export default async function MeterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params

  const { data: meterData } = await supabase.from("meters").select("*").eq("id", id).single()
  const meter = (meterData as Meter) || null

  if (!meter) {
    return <ContractDetail initialMeter={null} initialContract={null} initialRates={[]} initialReadings={[]} />
  }

  const contractRes = await supabase
    .from("contracts")
    .select("*")
    .eq("meter_id", id)
    .order("period_start", { ascending: false })
    .limit(1)
    .single()

  const contract = (contractRes.data as Contract) || null

  const [ratesRes, readingsRes] = await Promise.all([
    contract
      ? supabase.from("rates").select("*").eq("contract_id", contract.id).order("effective_from", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase.from("readings").select("*").eq("meter_id", id).order("date", { ascending: false }),
  ])

  const rates = (ratesRes.data as Rate[]) || []
  const readings = (readingsRes.data as Reading[]) || []

  return (
    <ContractDetail
      initialMeter={meter}
      initialContract={contract}
      initialRates={rates}
      initialReadings={readings}
    />
  )
}

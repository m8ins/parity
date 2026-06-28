import { ContractDetail } from "@/components/contract-detail"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Meter, MeterData } from "@/lib/types"
import { loadMeterData } from "@/lib/contracts"

export default async function MeterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params

  const { data: meterData } = await supabase.from("meters").select("*").eq("id", id).single()
  const meter = (meterData as Meter) || null

  const empty: MeterData = { contracts: [], ratesByContract: {}, readings: [] }

  if (!meter) {
    return <ContractDetail initialMeter={null} initialData={empty} />
  }

  const data = await loadMeterData(supabase, id)

  return <ContractDetail initialMeter={meter} initialData={data} />
}

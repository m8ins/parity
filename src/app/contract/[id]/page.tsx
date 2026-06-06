import { redirect } from "next/navigation"

// Old route — meter detail is now at /meter/[id]
export default function ContractDetailPage({ params }: { params: { id: string } }) {
  redirect(`/meter/${params.id}`)
}

import { notFound } from 'next/navigation';
import { Dashboard } from '@/components/dashboard';
import { readingFixture } from '@/lib/reading-fixture';

export default function ReadingPreview() {
  if (process.env.NODE_ENV !== 'development' || process.env.PARITY_DESIGN_PREVIEW !== '1') notFound();
  return <>
    <p className="parity-page text-sm [overflow-wrap:anywhere]">Designvorschau · synthetische Testdaten · keine Persistenzabnahme</p>
    <Dashboard {...readingFixture} />
  </>;
}

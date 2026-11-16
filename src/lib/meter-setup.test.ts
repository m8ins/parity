import { describe, it, expect } from 'vitest'
import { initialSetupValues, validateSetup, setupPayload } from './meter-setup'
const valid = { ...initialSetupValues(), name: 'Strom', period_start: '2025-01-01', reading_date: '2025-02-01', reading_value: '0', grundpreis: '0', arbeitspreis: '32,457', abschlag: '0' }
describe('setup validation', () => {
  it('allows open and short periods, explicit zero and price precision', () => {
    expect(validateSetup(valid)).toEqual({})
    expect(validateSetup({ ...valid, period_end: '2025-02-02' })).toEqual({})
    expect(setupPayload(valid)).toMatchObject({ arbeitspreis: 32.457, period_end: null, reading_value: 0 })
  })
  it('rejects blank prices, negatives, non-finite numbers and impossible or future dates', () => {
    for (const value of ['', '-1', 'Infinity', 'NaN', '1e9']) expect(validateSetup({ ...valid, arbeitspreis: value })).toHaveProperty('arbeitspreis')
    expect(validateSetup({ ...valid, reading_date: '2025-02-30' })).toHaveProperty('reading_date')
    expect(validateSetup({ ...valid, period_start: '2099-01-01' })).toHaveProperty('period_start')
    expect(validateSetup({ ...valid, reading_date: '2024-12-31' })).toHaveProperty('reading_date')
    expect(validateSetup({ ...valid, period_end: '2025-01-01' })).toHaveProperty('period_end')
  })
  it('requires a positive gas factor and always normalizes electricity to one', () => {
    expect(validateSetup({ ...valid, type: 'gas', umrechnungsfaktor: '0' })).toHaveProperty('umrechnungsfaktor')
    expect(setupPayload({ ...valid, type: 'gas', umrechnungsfaktor: '10,7' }).umrechnungsfaktor).toBe(10.7)
    expect(setupPayload({ ...valid, umrechnungsfaktor: '10' }).umrechnungsfaktor).toBe(1)
  })
})

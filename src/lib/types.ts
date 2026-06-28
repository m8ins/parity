export type MeterType = 'electricity' | 'gas';

export interface Meter {
  id: string;
  user_id: string;
  name: string;
  type: MeterType;
  monthly_distribution?: number[];
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  meter_id: string;
  period_start: string; // ISO Date YYYY-MM-DD
  period_end?: string;
  provider?: string; // energy supplier for this period (e.g. "e.on", "Vattenfall")
  settlement_amount?: number; // signed €: >= 0 = Erstattung, < 0 = Nachzahlung
  settlement_date?: string; // ISO Date YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface Rate {
  id: string;
  contract_id: string;
  effective_from: string; // ISO Date YYYY-MM-DD
  grundpreis: number;     // €/month
  arbeitspreis: number;   // ct/kWh
  abschlag: number;       // €/month
  umrechnungsfaktor: number; // kWh/m³ (1 for electricity)
  created_at: string;
}

export interface Reading {
  id: string;
  meter_id: string;
  date: string; // ISO Date YYYY-MM-DD
  value: number;
  created_at: string;
}

// All billing periods of a single meter, plus the rates per period and the
// meter's (cumulative) readings. Used by the dashboard and detail views to
// switch between contract years.
export interface MeterData {
  contracts: Contract[]; // newest period first
  ratesByContract: Record<string, Rate[]>; // rates per contract id, oldest first
  readings: Reading[]; // ascending by date
}

// Standard Load Profile (H0) approximation for German households.
// Jan = index 0, Dec = index 11. Sums to 1.0.
export const GAS_WEIGHTS = [
  0.170, // Jan
  0.150, // Feb
  0.120, // Mar
  0.080, // Apr
  0.040, // May
  0.020, // Jun
  0.015, // Jul
  0.015, // Aug
  0.035, // Sep
  0.090, // Oct
  0.120, // Nov
  0.145  // Dec
];

export const ELECTRICITY_WEIGHTS = Array(12).fill(1 / 12);

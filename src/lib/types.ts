export type ContractType = 'electricity' | 'gas';

export interface Contract {
  id: string;
  user_id: string;
  name: string;
  type: ContractType;
  provider?: string;
  start_date: string; // ISO Date string YYYY-MM-DD
  end_date?: string;

  // Deprecated flat fields. Use fetched history instead.
  // base_price_monthly: number;
  // energy_price_cents_per_kwh: number;
  // monthly_payment: number;

  monthly_distribution?: number[];
  conversion_factor_m3_to_kwh?: number; // Optional on frontend until fetched, but DB says not null default 1

  created_at: string;
  updated_at: string;
}

export interface ContractPrice {
  id: string;
  contract_id: string;
  valid_from: string;
  base_price_monthly: number;
  energy_price_cents_per_kwh: number;
}

export interface ContractPayment {
  id: string;
  contract_id: string;
  valid_from: string;
  monthly_payment: number;
}

export interface Reading {
  id: string;
  contract_id: string;
  date: string; // ISO Date string YYYY-MM-DD
  value: number;
  created_at: string;
}

// Standard Load Profile (H0) approximation for households in Germany
// Simplistic percentage of yearly consumption per month.
// Jan is 0, Dec is 11.
// Based on typical heating degree days or standard load profiles + hot water.
export const GAS_MONTHLY_WEIGHTS = [
  0.16, // Jan
  0.13, // Feb
  0.10, // Mar
  0.06, // Apr
  0.03, // May
  0.02, // Jun
  0.02, // Jul
  0.02, // Aug
  0.04, // Sep
  0.08, // Oct
  0.13, // Nov
  0.21  // Dec - ERROR: Sum must be ~1.0. Let me adjust to match a real curve better.
];
// Re-adjusting weights to sum to 1.0 (approx)
// Source: Standard load profile (Sigmoid like curve peaking in Jan/Dec)
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
// Sum: 0.17+0.15+0.12 = 0.44
// 0.08+0.04+0.02 = 0.14
// 0.015+0.015+0.035 = 0.065
// 0.09+0.12+0.145 = 0.355
// Total: 0.44+0.14+0.065+0.355 = 1.00

export const ELECTRICITY_WEIGHTS = Array(12).fill(1 / 12); // Linear

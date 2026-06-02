export interface FilterState {
  customerId: string | null;
  brand: string | null;
  type: string | null;
  formation: string | null;
  productId: string | null;
}

export interface ParsedRow {
  customerName: string;
  brand: string;
  type: string;
  formation: string;
  productName: string;
  productNumber: string;
  month: string; // ISO date string YYYY-MM-DD
  posCases: number | null;
  invoiceCases: number | null;
  orderCases: number | null;
  forecast: number | null;
  customerPosProjection: number | null; // optional, forward-looking POS the customer expects to sell
}

export interface Customer {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  productNumber: string;
  productName: string;
  brand: string;
  type: string;
  formation: string;
}

export interface DashboardRow {
  month: string;
  posCases: number | null;
  invoiceCases: number | null;
  orderCases: number | null;
  existingForecast: number | null;
  statForecast: number | null;
  customerPosProjection: number | null;
  overrideVal: number | null;
  finalValue: number | null;
  isHistorical: boolean;
}

export interface FilterOptions {
  customers: Customer[];
  brands: string[];
  types: string[];
  formations: string[];
  products: Product[];
}

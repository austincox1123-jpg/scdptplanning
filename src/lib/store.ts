import { create } from 'zustand';
import { FilterState, ParsedRow, Customer, Product, FilterOptions, DashboardRow } from '@/types';
import { ForecastParams, ForecastResult, ActualData } from '@/lib/forecast/types';
import { runForecast, checkPosDataAvailability } from '@/lib/forecast/engine';

interface Override {
  month: string;
  value: number;
  note?: string;
}

interface AppState {
  // Raw parsed data from upload
  parsedRows: ParsedRow[];
  customers: Customer[];
  products: Product[];
  filterOptions: FilterOptions;
  fileLoaded: boolean;
  fileName: string | null;

  // Filters
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: string | null) => void;
  resetFilters: () => void;

  // Forecast config
  forecastParams: ForecastParams;
  setForecastParams: (params: Partial<ForecastParams>) => void;
  horizonMonths: number;
  setHorizonMonths: (months: number) => void;

  // Forecast results (keyed by "customerId|productId")
  forecastResults: Map<string, ForecastResult[]>;

  // Overrides (keyed by "customerId|productId|month")
  overrides: Map<string, Override>;

  // POS data availability for current selection
  hasPosData: boolean;

  // Actions
  loadData: (rows: ParsedRow[], fileName: string) => void;
  runCurrentForecast: () => void;
  setOverride: (month: string, value: number | null, note?: string) => void;
  getFilteredRows: () => ParsedRow[];
  getDashboardRows: () => DashboardRow[];
  getActualsForForecast: () => ActualData[];
}

const defaultFilters: FilterState = {
  customerId: null,
  brand: null,
  type: null,
  formation: null,
  productId: null,
};

const defaultForecastParams: ForecastParams = {
  method: 'weighted_ma',
  source: 'invoice',
  window: 6,
  weightProfile: 'linear_decay',
  seasonalityEnabled: false,
};

function deriveFilterOptions(rows: ParsedRow[]): { customers: Customer[]; products: Product[]; filterOptions: FilterOptions } {
  const customerMap = new Map<string, Customer>();
  const productMap = new Map<string, Product>();

  for (const row of rows) {
    if (!customerMap.has(row.customerName)) {
      customerMap.set(row.customerName, { id: row.customerName, name: row.customerName });
    }
    if (!productMap.has(row.productNumber)) {
      productMap.set(row.productNumber, {
        id: row.productNumber,
        productNumber: row.productNumber,
        productName: row.productName || row.productNumber,
        brand: row.brand || '',
        type: row.type || '',
        formation: row.formation || '',
      });
    }
  }

  const customers = [...customerMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  const products = [...productMap.values()].sort((a, b) => a.productName.localeCompare(b.productName));
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
  const types = [...new Set(products.map(p => p.type).filter(Boolean))].sort();
  const formations = [...new Set(products.map(p => p.formation).filter(Boolean))].sort();

  return {
    customers,
    products,
    filterOptions: { customers, brands, types, formations, products },
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  parsedRows: [],
  customers: [],
  products: [],
  filterOptions: { customers: [], brands: [], types: [], formations: [], products: [] },
  fileLoaded: false,
  fileName: null,

  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => {
      const newFilters = { ...state.filters, [key]: value };
      return { filters: newFilters };
    }),
  resetFilters: () => set({ filters: defaultFilters }),

  forecastParams: defaultForecastParams,
  setForecastParams: (params) =>
    set((state) => ({
      forecastParams: { ...state.forecastParams, ...params },
    })),
  horizonMonths: 18,
  setHorizonMonths: (months) => set({ horizonMonths: months }),

  forecastResults: new Map(),
  overrides: new Map(),
  hasPosData: false,

  loadData: (rows, fileName) => {
    const { customers, products, filterOptions } = deriveFilterOptions(rows);
    const hasPosData = rows.some(r => r.posCases !== null && r.posCases > 0);
    set({
      parsedRows: rows,
      customers,
      products,
      filterOptions,
      fileLoaded: true,
      fileName,
      filters: defaultFilters,
      forecastResults: new Map(),
      overrides: new Map(),
      hasPosData,
    });
  },

  getFilteredRows: () => {
    const { parsedRows, filters, products } = get();
    return parsedRows.filter((row) => {
      if (filters.customerId && row.customerName !== filters.customerId) return false;
      if (filters.productId && row.productNumber !== filters.productId) return false;
      if (filters.brand && row.brand !== filters.brand) return false;
      if (filters.type && row.type !== filters.type) return false;
      if (filters.formation && row.formation !== filters.formation) return false;
      return true;
    });
  },

  getActualsForForecast: () => {
    const filtered = get().getFilteredRows();
    // Aggregate by month
    const monthMap = new Map<string, ActualData>();
    for (const row of filtered) {
      const existing = monthMap.get(row.month);
      if (existing) {
        existing.posCases = (existing.posCases ?? 0) + (row.posCases ?? 0);
        existing.invoiceCases = (existing.invoiceCases ?? 0) + (row.invoiceCases ?? 0);
        existing.orderCases = (existing.orderCases ?? 0) + (row.orderCases ?? 0);
      } else {
        monthMap.set(row.month, {
          month: row.month,
          posCases: row.posCases,
          invoiceCases: row.invoiceCases,
          orderCases: row.orderCases,
        });
      }
    }
    // Only return months that have actual data (not just forecast)
    return [...monthMap.values()]
      .filter(a => (a.posCases ?? 0) > 0 || (a.invoiceCases ?? 0) > 0 || (a.orderCases ?? 0) > 0)
      .sort((a, b) => a.month.localeCompare(b.month));
  },

  runCurrentForecast: () => {
    const { forecastParams, filters, horizonMonths } = get();
    const actuals = get().getActualsForForecast();
    if (actuals.length === 0) return;

    const hasPosData = checkPosDataAvailability(actuals);
    const results = runForecast(actuals, forecastParams, horizonMonths);

    const key = `${filters.customerId ?? 'all'}|${filters.productId ?? 'all'}`;
    const newMap = new Map(get().forecastResults);
    newMap.set(key, results);

    set({ forecastResults: newMap, hasPosData });
  },

  setOverride: (month, value, note) => {
    const { filters } = get();
    const key = `${filters.customerId ?? 'all'}|${filters.productId ?? 'all'}|${month}`;
    const newOverrides = new Map(get().overrides);
    if (value === null) {
      newOverrides.delete(key);
    } else {
      newOverrides.set(key, { month, value, note });
    }
    set({ overrides: newOverrides });
  },

  getDashboardRows: () => {
    const { filters, forecastResults, overrides } = get();
    const filtered = get().getFilteredRows();

    // Aggregate actuals by month
    const actualMap = new Map<string, { pos: number; invoice: number; order: number }>();
    const existingForecastMap = new Map<string, number>();
    const projectionMap = new Map<string, number>();

    for (const row of filtered) {
      const hasActuals = (row.posCases ?? 0) > 0 || (row.invoiceCases ?? 0) > 0 || (row.orderCases ?? 0) > 0;
      if (hasActuals) {
        const prev = actualMap.get(row.month) ?? { pos: 0, invoice: 0, order: 0 };
        actualMap.set(row.month, {
          pos: prev.pos + (row.posCases ?? 0),
          invoice: prev.invoice + (row.invoiceCases ?? 0),
          order: prev.order + (row.orderCases ?? 0),
        });
      }
      if (row.forecast != null) {
        const prev = existingForecastMap.get(row.month) ?? 0;
        existingForecastMap.set(row.month, prev + row.forecast);
      }
      if (row.customerPosProjection != null) {
        const prev = projectionMap.get(row.month) ?? 0;
        projectionMap.set(row.month, prev + row.customerPosProjection);
      }
    }

    // Get stat forecast results for current filter key
    const fcKey = `${filters.customerId ?? 'all'}|${filters.productId ?? 'all'}`;
    const statResults = forecastResults.get(fcKey) ?? [];
    const statMap = new Map(statResults.map(r => [r.month, r.statValue]));

    // Collect all months
    const allMonths = new Set<string>();
    actualMap.forEach((_, m) => allMonths.add(m));
    existingForecastMap.forEach((_, m) => allMonths.add(m));
    statMap.forEach((_, m) => allMonths.add(m));
    projectionMap.forEach((_, m) => allMonths.add(m));

    const overridePrefix = `${filters.customerId ?? 'all'}|${filters.productId ?? 'all'}|`;

    return [...allMonths].sort().map((month) => {
      const actual = actualMap.get(month);
      const existing = existingForecastMap.get(month);
      const stat = statMap.get(month);
      const projection = projectionMap.get(month);
      const overrideKey = overridePrefix + month;
      const override = overrides.get(overrideKey);
      const isHistorical = !!actual;

      return {
        month,
        posCases: actual?.pos ?? null,
        invoiceCases: actual?.invoice ?? null,
        orderCases: actual?.order ?? null,
        existingForecast: existing ?? null,
        statForecast: stat ?? null,
        customerPosProjection: projection ?? null,
        overrideVal: override?.value ?? null,
        finalValue: override?.value ?? stat ?? existing ?? null,
        isHistorical,
      };
    });
  },
}));

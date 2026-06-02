// Maps known upload column names to internal field names
export const COLUMN_MAP: Record<string, string> = {
  'CUSTOMER_NAME': 'customerName',
  'BRAND': 'brand',
  'TYPE': 'type',
  'FORMATION': 'formation',
  'PRODUCTNAME': 'productName',
  'PRODUCTNUMBER': 'productNumber',
  'END_OF_MONTH_EPOCH': 'endOfMonthEpoch',
  'POS CASES': 'posCases',
  'INVOICE CASES': 'invoiceCases',
  'ORDER CASES': 'orderCases',
  'FORECAST': 'forecast',
  'CUSTOMER POS PROJECTION CASES': 'customerPosProjection',
};

export const REQUIRED_COLUMNS = [
  'CUSTOMER_NAME',
  'PRODUCTNUMBER',
  'END_OF_MONTH_EPOCH',
];

export function validateColumns(headers: string[]): { valid: boolean; missing: string[] } {
  const upperHeaders = headers.map(h => h.trim().toUpperCase());
  const missing = REQUIRED_COLUMNS.filter(col => !upperHeaders.includes(col));
  return { valid: missing.length === 0, missing };
}

export function mapRow(row: Record<string, unknown>, headers: string[]): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const header of headers) {
    const upperHeader = header.trim().toUpperCase();
    const fieldName = COLUMN_MAP[upperHeader];
    if (fieldName) {
      mapped[fieldName] = row[header];
    }
  }
  return mapped;
}

import * as XLSX from 'xlsx';
import { validateColumns, mapRow } from './columnMapper';
import { ParsedRow } from '@/types';

export interface ParseResult {
  success: boolean;
  rows: ParsedRow[];
  errors: string[];
  rowCount: number;
}

export function parseExcelBuffer(buffer: ArrayBuffer): ParseResult {
  const errors: string[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, rows: [], errors: ['No sheets found in file'], rowCount: 0 };
    }

    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (rawData.length === 0) {
      return { success: false, rows: [], errors: ['Sheet is empty'], rowCount: 0 };
    }

    // Validate columns
    const headers = Object.keys(rawData[0]);
    const { valid, missing } = validateColumns(headers);
    if (!valid) {
      return {
        success: false,
        rows: [],
        errors: [`Missing required columns: ${missing.join(', ')}`],
        rowCount: 0,
      };
    }

    const rows: ParsedRow[] = [];
    for (let i = 0; i < rawData.length; i++) {
      const mapped = mapRow(rawData[i], headers);

      const customerName = String(mapped.customerName || '').trim();
      const productNumber = String(mapped.productNumber || '').trim();
      const endOfMonthEpoch = String(mapped.endOfMonthEpoch || '').trim();

      if (!customerName) {
        errors.push(`Row ${i + 2}: Missing CUSTOMER_NAME`);
        continue;
      }
      if (!productNumber) {
        errors.push(`Row ${i + 2}: Missing PRODUCTNUMBER`);
        continue;
      }
      if (!endOfMonthEpoch) {
        errors.push(`Row ${i + 2}: Missing END_OF_MONTH_EPOCH`);
        continue;
      }

      // Parse the date — handle Excel serial numbers and date strings
      let month: string;
      const rawDate = mapped.endOfMonthEpoch;
      if (typeof rawDate === 'number') {
        // Excel serial date number
        const date = XLSX.SSF.parse_date_code(rawDate);
        month = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      } else {
        // Try parsing as date string
        const parsed = new Date(String(rawDate));
        if (isNaN(parsed.getTime())) {
          errors.push(`Row ${i + 2}: Invalid date "${rawDate}"`);
          continue;
        }
        month = parsed.toISOString().split('T')[0];
      }

      rows.push({
        customerName,
        brand: mapped.brand ? String(mapped.brand).trim() : '',
        type: mapped.type ? String(mapped.type).trim() : '',
        formation: mapped.formation ? String(mapped.formation).trim() : '',
        productName: mapped.productName ? String(mapped.productName).trim() : '',
        productNumber,
        month,
        posCases: mapped.posCases != null && mapped.posCases !== '' ? Number(mapped.posCases) : null,
        invoiceCases: mapped.invoiceCases != null && mapped.invoiceCases !== '' ? Number(mapped.invoiceCases) : null,
        orderCases: mapped.orderCases != null && mapped.orderCases !== '' ? Number(mapped.orderCases) : null,
        forecast: mapped.forecast != null && mapped.forecast !== '' ? Number(mapped.forecast) : null,
        customerPosProjection: mapped.customerPosProjection != null && mapped.customerPosProjection !== '' ? Number(mapped.customerPosProjection) : null,
      });
    }

    return { success: true, rows, errors, rowCount: rows.length };
  } catch (err) {
    return {
      success: false,
      rows: [],
      errors: [`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`],
      rowCount: 0,
    };
  }
}

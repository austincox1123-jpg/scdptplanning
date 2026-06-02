import ExcelJS from 'exceljs';
import { DashboardRow } from '@/types';

interface ExportOptions {
  customerName: string;
  productName: string;
  configMethod?: string;
  configParams?: Record<string, unknown>;
  fileName?: string;
}

export async function exportToExcel(
  rows: DashboardRow[],
  options: ExportOptions
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  // Tab 1: History
  const historySheet = workbook.addWorksheet('History');
  historySheet.columns = [
    { header: 'Month', key: 'month', width: 15 },
    { header: 'POS Cases', key: 'posCases', width: 15 },
    { header: 'Invoice Cases', key: 'invoiceCases', width: 15 },
    { header: 'Order Cases', key: 'orderCases', width: 15 },
  ];
  for (const row of rows.filter(r => r.isHistorical)) {
    historySheet.addRow({
      month: row.month,
      posCases: row.posCases,
      invoiceCases: row.invoiceCases,
      orderCases: row.orderCases,
    });
  }

  // Tab 2: Existing Forecast
  const existingSheet = workbook.addWorksheet('Existing Forecast');
  existingSheet.columns = [
    { header: 'Month', key: 'month', width: 15 },
    { header: 'Existing Forecast', key: 'existingForecast', width: 20 },
  ];
  for (const row of rows.filter(r => r.existingForecast != null)) {
    existingSheet.addRow({
      month: row.month,
      existingForecast: row.existingForecast,
    });
  }

  // Tab 3: Statistical Forecast
  const statSheet = workbook.addWorksheet('Statistical Forecast');
  statSheet.columns = [
    { header: 'Month', key: 'month', width: 15 },
    { header: 'Stat Forecast', key: 'statForecast', width: 20 },
  ];
  for (const row of rows.filter(r => r.statForecast != null)) {
    statSheet.addRow({
      month: row.month,
      statForecast: row.statForecast,
    });
  }

  // Tab 4: Final Forecast
  const finalSheet = workbook.addWorksheet('Final Forecast');
  finalSheet.columns = [
    { header: 'Month', key: 'month', width: 15 },
    { header: 'Final Value', key: 'finalValue', width: 20 },
    { header: 'Override', key: 'override', width: 15 },
    { header: 'Customer POS Projection', key: 'customerPosProjection', width: 24 },
    { header: 'Source', key: 'source', width: 15 },
  ];
  for (const row of rows.filter(r => !r.isHistorical)) {
    finalSheet.addRow({
      month: row.month,
      finalValue: row.finalValue,
      override: row.overrideVal,
      customerPosProjection: row.customerPosProjection,
      source: row.overrideVal != null ? 'Override' : 'Statistical',
    });
  }

  // Tab 5: Config
  const configSheet = workbook.addWorksheet('Config');
  configSheet.columns = [
    { header: 'Parameter', key: 'param', width: 25 },
    { header: 'Value', key: 'value', width: 30 },
  ];
  configSheet.addRow({ param: 'Customer', value: options.customerName });
  configSheet.addRow({ param: 'Product', value: options.productName });
  configSheet.addRow({ param: 'Method', value: options.configMethod ?? 'N/A' });
  if (options.configParams) {
    for (const [key, val] of Object.entries(options.configParams)) {
      configSheet.addRow({ param: key, value: String(val) });
    }
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.fileName ?? `forecast_export.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

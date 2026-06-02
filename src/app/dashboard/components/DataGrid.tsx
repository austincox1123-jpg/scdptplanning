'use client';

import { useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, CellValueChangedEvent, CellStyle } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { DashboardRow } from '@/types';

ModuleRegistry.registerModules([AllCommunityModule]);

interface DataGridProps {
  rows: DashboardRow[];
  onOverride: (month: string, value: number | null) => void;
}

export function DataGrid({ rows, onOverride }: DataGridProps) {
  const gridRef = useRef<AgGridReact>(null);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'month',
        headerName: 'Month',
        width: 120,
        pinned: 'left',
      },
      {
        field: 'posCases',
        headerName: 'POS Cases',
        width: 120,
        type: 'numericColumn',
        valueFormatter: (p) => p.value != null ? Number(p.value).toLocaleString() : '',
      },
      {
        field: 'invoiceCases',
        headerName: 'Invoice Cases',
        width: 130,
        type: 'numericColumn',
        valueFormatter: (p) => p.value != null ? Number(p.value).toLocaleString() : '',
      },
      {
        field: 'orderCases',
        headerName: 'Order Cases',
        width: 120,
        type: 'numericColumn',
        valueFormatter: (p) => p.value != null ? Number(p.value).toLocaleString() : '',
      },
      {
        field: 'existingForecast',
        headerName: 'Existing Fcst',
        width: 130,
        type: 'numericColumn',
        valueFormatter: (p) => p.value != null ? Number(p.value).toLocaleString() : '',
      },
      {
        field: 'statForecast',
        headerName: 'Stat Forecast',
        width: 130,
        type: 'numericColumn',
        valueFormatter: (p) => p.value != null ? Number(p.value).toLocaleString() : '',
        cellStyle: { color: '#8b5cf6' } as CellStyle,
      },
      {
        field: 'customerPosProjection',
        headerName: 'Cust POS Proj',
        width: 140,
        type: 'numericColumn',
        valueFormatter: (p) => p.value != null ? Number(p.value).toLocaleString() : '',
        cellStyle: { color: '#0891b2' } as CellStyle,
      },
      {
        field: 'overrideVal',
        headerName: 'Override',
        width: 120,
        type: 'numericColumn',
        editable: (p) => !p.data.isHistorical,
        cellStyle: (p) =>
          p.value != null
            ? { backgroundColor: '#dcfce7', color: '#166534', fontWeight: 'bold' }
            : undefined,
        valueFormatter: (p) => p.value != null ? Number(p.value).toLocaleString() : '',
      },
      {
        field: 'finalValue',
        headerName: 'Final',
        width: 120,
        type: 'numericColumn',
        valueFormatter: (p) => p.value != null ? Number(p.value).toLocaleString() : '',
        cellStyle: { fontWeight: 'bold' } as CellStyle,
      },
    ],
    []
  );

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      if (event.colDef.field === 'overrideVal') {
        const newVal = event.newValue === '' || event.newValue == null
          ? null
          : Number(event.newValue);
        onOverride(event.data.month, newVal);
      }
    },
    [onOverride]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={onCellValueChanged}
          animateRows
        />
      </div>
    </div>
  );
}

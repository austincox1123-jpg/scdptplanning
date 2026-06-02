'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { parseExcelBuffer, ParseResult } from '@/lib/excel/parser';
import { useAppStore } from '@/lib/store';

export default function UploadPage() {
  const router = useRouter();
  const loadData = useAppStore((s) => s.loadData);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
      setError(null);
      setResult(null);
    } else {
      setError('Please upload an .xlsx or .csv file');
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const parseResult = parseExcelBuffer(buffer);

      if (!parseResult.success) {
        setError(parseResult.errors.join('; '));
        return;
      }

      setResult(parseResult);
      // Load parsed data into the Zustand store
      loadData(parseResult.rows, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setProcessing(false);
    }
  };

  // Count unique customers and products from parsed rows
  const uniqueCustomers = result ? new Set(result.rows.map((r) => r.customerName)).size : 0;
  const uniqueProducts = result ? new Set(result.rows.map((r) => r.productNumber)).size : 0;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Sales Data</h1>
      <p className="text-gray-600 mb-8">
        Upload an Excel file (.xlsx) or CSV with your sales history and existing forecast data.
        All processing happens in your browser — no data is sent to a server.
      </p>

      {/* Expected columns */}
      <div className="mb-8 bg-gray-50 border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Expected Columns</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs text-gray-600">
          <span className="font-mono bg-white px-2 py-1 rounded border">CUSTOMER_NAME *</span>
          <span className="font-mono bg-white px-2 py-1 rounded border">PRODUCTNUMBER *</span>
          <span className="font-mono bg-white px-2 py-1 rounded border">END_OF_MONTH_EPOCH *</span>
          <span className="font-mono bg-white px-2 py-1 rounded border">BRAND</span>
          <span className="font-mono bg-white px-2 py-1 rounded border">TYPE</span>
          <span className="font-mono bg-white px-2 py-1 rounded border">FORMATION</span>
          <span className="font-mono bg-white px-2 py-1 rounded border">PRODUCTNAME</span>
          <span className="font-mono bg-white px-2 py-1 rounded border">POS CASES</span>
          <span className="font-mono bg-white px-2 py-1 rounded border">INVOICE CASES</span>
          <span className="font-mono bg-white px-2 py-1 rounded border">ORDER CASES</span>
          <span className="font-mono bg-white px-2 py-1 rounded border">FORECAST</span>
          <span className="font-mono bg-white px-2 py-1 rounded border">CUSTOMER POS PROJECTION CASES</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">* Required columns</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.csv"
          onChange={handleFileInput}
          className="hidden"
        />
        {file ? (
          <div>
            <p className="text-lg font-medium text-gray-900">{file.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600">Drag and drop your file here, or click to browse</p>
            <p className="text-sm text-gray-400 mt-1">.xlsx or .csv files</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {file && !result && (
        <button
          onClick={handleProcess}
          disabled={processing}
          className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {processing ? 'Processing...' : 'Process File'}
        </button>
      )}

      {result && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-800 mb-3">File Processed Successfully</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-green-600">Rows</p>
              <p className="text-2xl font-bold text-green-800">{result.rowCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-green-600">Customers</p>
              <p className="text-2xl font-bold text-green-800">{uniqueCustomers}</p>
            </div>
            <div>
              <p className="text-green-600">Products</p>
              <p className="text-2xl font-bold text-green-800">{uniqueProducts}</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4 text-sm text-yellow-700">
              <p className="font-medium">Warnings ({result.errors.length}):</p>
              <ul className="list-disc list-inside mt-1">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {result.errors.length > 5 && (
                  <li>...and {result.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

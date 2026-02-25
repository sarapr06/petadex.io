/**
 * CSV generation and download utilities
 */

/**
 * Generate CSV content from data array
 * @param {string[]} headers - Column headers
 * @param {Array<Array<string|number>>} rows - Data rows
 * @returns {string} CSV content
 */
export function generateCSV(headers, rows) {
  const escapeCell = (cell) => {
    if (cell === null || cell === undefined) return '';
    const str = String(cell);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const dataLines = rows.map(row => row.map(escapeCell).join(','));

  return [headerLine, ...dataLines].join('\n');
}

/**
 * Trigger browser download of a CSV file
 * @param {string} csvContent - CSV content string
 * @param {string} filename - Download filename (without extension)
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

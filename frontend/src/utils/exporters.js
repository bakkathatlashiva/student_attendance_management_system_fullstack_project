/**
 * Exports data as a CSV spreadsheet.
 * @param {Array} headers - Array of column titles
 * @param {Array<Array>} rows - 2D Array of row values
 * @param {string} fileName - Target file name without extension
 */
export const exportToCSV = (headers, rows, fileName) => {
  if (!rows || !rows.length) return;

  const csvContent = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(","),
    ...rows.map(row => 
      row.map(val => {
        const strVal = val === null || val === undefined ? "" : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(",")
    )
  ].join("\n");

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {
    type: "text/csv;charset=utf-8;"
  });
  
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Triggers browser PDF printing view.
 * The styling for printing is defined in src/styles.css using @media print.
 */
export const exportToPDF = () => {
  window.print();
};

const makeRow = (cells) => (`<tr>${cells.join('')}</tr>`);
const makeCell = (cell) => (`<td>${cell}</td>`);
const makeHeadCell = (cell) => (`<th>${cell}</th>`);

const makeHeaders = (columns) => (
    makeRow(columns.map(col => makeHeadCell(col.label)))
);

const makeCells = (record, columns) => (columns.map(col => record[col.key]));

const makeDataRow = (rowData) => (
    makeRow(rowData.map(cell => makeCell(cell)))
);

export const makeTable = ({ arr, columns }) => {
    const headers = makeHeaders(columns);
    const rowData = arr.map(record => makeCells(record, columns));
    const rows = rowData.map(row => makeDataRow(row)).join('\n');
    return `<table>
${headers}\n
${rows}\n
    </table>`;
};
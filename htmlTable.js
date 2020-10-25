const makeRow = (cells) => (`<tr>${cells.join('')}</tr>`);
const makeCell = (cell) => (`<td ${cell.right? 'class="right"':''}>${cell.label}</td>`);
const makeHeadCell = (cell) => (`<th ${cell.right? 'class="right"':''}>${cell.label}</th>`);

const makeHeaders = (columns) => (
    makeRow(columns.map(makeHeadCell))
);

const makeCells = (record, columns) => (columns.map(col => ({
    label: record[col.key],
    right: col.right
})));

const makeDataRow = (rowData) => (
    makeRow(rowData.map(makeCell))
);

export const makeTable = ({ arr, columns }) => {
    const headers = makeHeaders(columns);
    const rowData = arr.map(record => makeCells(record, columns));
    const rows = rowData.map(row => makeDataRow(row)).join('\n');
    return `<table class="datatable">
${headers}\n
${rows}\n
</table>`;
};
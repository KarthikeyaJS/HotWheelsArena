/** Tiny ASCII table renderer for script summaries (plain ASCII so every terminal renders it). */

export type Align = 'left' | 'right';

export interface Column {
  header: string;
  align?: Align;
}

export type Cell = string | number;

export interface TableOptions {
  /** Optional totals row, rendered under a separator. */
  footer?: readonly Cell[];
  /** Left indent for every line. */
  indent?: string;
}

const toText = (cell: Cell | undefined): string => (cell === undefined ? '' : String(cell));

export function renderTable(
  columns: readonly Column[],
  rows: readonly (readonly Cell[])[],
  options: TableOptions = {},
): string {
  const allRows = options.footer ? [...rows, options.footer] : rows;
  const widths = columns.map((column, index) =>
    Math.max(column.header.length, ...allRows.map((row) => toText(row[index]).length)),
  );
  const indent = options.indent ?? '  ';
  const separator = `${indent}+${widths.map((width) => '-'.repeat(width + 2)).join('+')}+`;
  const line = (cells: readonly Cell[], header = false): string =>
    `${indent}|${columns
      .map((column, index) => {
        const text = toText(cells[index]);
        const width = widths[index] ?? 0;
        const padded =
          !header && column.align === 'right' ? text.padStart(width) : text.padEnd(width);
        return ` ${padded} `;
      })
      .join('|')}|`;

  const out = [separator, line(columns.map((column) => column.header), true), separator];
  for (const row of rows) out.push(line(row));
  out.push(separator);
  if (options.footer) {
    out.push(line(options.footer), separator);
  }
  return out.join('\n');
}

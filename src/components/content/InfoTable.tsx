import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface InfoTableRow {
  id: string;
  label: ReactNode;
  /** Mono value column (durations, amounts). */
  value: ReactNode;
  note?: ReactNode;
}

export interface InfoTableProps {
  /** Visible table caption (also its accessible name). */
  caption: string;
  columns: readonly [string, string, string?];
  rows: readonly InfoTableRow[];
  className?: string;
}

/**
 * Compact data table for static pages (delivery windows, refund timelines). Below 640px the
 * three columns can't fit (CA-04), so phones get the same rows as a stacked list (label + value
 * on one line, the note underneath); only one of the two is ever displayed.
 */
export function InfoTable({ caption, columns, rows, className }: InfoTableProps) {
  const [labelHeading, valueHeading, noteHeading] = columns;
  const captionId = `info-table-${useId().replace(/:/g, '')}`;
  return (
    <div
      className={cn(
        'max-w-full overflow-hidden rounded-xl border border-line bg-card shadow-card',
        className,
      )}
    >
      <div className="sm:hidden">
        <p id={captionId} className="hud border-b border-line px-4 py-3 text-muted">
          {caption}
        </p>
        <ul aria-labelledby={captionId} className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-semibold text-fg">{row.label}</span>
                <span className="whitespace-nowrap font-mono font-bold tabular-nums text-fg">
                  <span className="sr-only">{valueHeading}: </span>
                  {row.value}
                </span>
              </div>
              {noteHeading && row.note ? (
                <p className="text-muted">
                  <span className="sr-only">{noteHeading}: </span>
                  {row.note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <table className="hidden w-full border-collapse text-left text-sm sm:table">
        <caption className="hud border-b border-line px-4 py-3 text-left text-muted">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="hud px-3 py-2.5 font-medium text-muted sm:px-4">
              {labelHeading}
            </th>
            <th scope="col" className="hud px-3 py-2.5 font-medium text-muted sm:px-4">
              {valueHeading}
            </th>
            {noteHeading ? (
              <th scope="col" className="hud px-3 py-2.5 font-medium text-muted sm:px-4">
                {noteHeading}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-line transition-colors last:border-b-0 hover:bg-card-hover"
            >
              <th scope="row" className="px-3 py-3 font-semibold text-fg sm:px-4">
                {row.label}
              </th>
              <td className="whitespace-nowrap px-3 py-3 font-mono font-bold tabular-nums text-fg sm:px-4">
                {row.value}
              </td>
              {noteHeading ? <td className="px-3 py-3 text-muted sm:px-4">{row.note}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { ReactNode } from 'react';
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

/** Compact data table for static pages (delivery windows, refund timelines). */
export function InfoTable({ caption, columns, rows, className }: InfoTableProps) {
  const [labelHeading, valueHeading, noteHeading] = columns;
  return (
    <div
      className={cn(
        'max-w-full overflow-hidden rounded-xl border border-line bg-card shadow-card',
        className,
      )}
    >
      <table className="w-full border-collapse text-left text-sm">
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

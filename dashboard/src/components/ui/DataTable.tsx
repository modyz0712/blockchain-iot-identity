import type { ReactNode } from "react";

type DataTableProps<T> = {
  columns: string[];
  rows: T[];
  emptyTitle: string;
  emptyMessage: string;
  renderRow: (row: T, index: number) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  emptyTitle,
  emptyMessage,
  renderRow,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <div className="empty"><strong>{emptyTitle}</strong><span>{emptyMessage}</span></div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map((row, index) => renderRow(row, index))}</tbody>
      </table>
    </div>
  );
}

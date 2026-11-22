import EmptyState from "./EmptyState";

export default function ResponsiveTable({
	columns,
	data,
	getRowKey,
	emptyState,
	caption,
	className = "",
}) {
	const rows = data ?? [];

	if (rows.length === 0) {
		return (
			<div className={className}>
				{emptyState ?? (
					<EmptyState title="Sin datos" description="No hay registros para mostrar." />
				)}
			</div>
		);
	}

	const renderCell = (column, row) =>
		column.render ? column.render(row) : row?.[column.key];

	return (
		<div className={className}>
			<div className="hidden overflow-x-auto rounded-2xl border border-sand-200 bg-surface md:block">
				<table className="w-full border-collapse text-left text-sm">
					{caption && <caption className="sr-only">{caption}</caption>}
					<thead className="sticky top-0 z-10 bg-sand-100 text-xs font-semibold uppercase tracking-wide text-ink-600">
						<tr>
							{columns.map((column) => (
								<th
									key={column.key}
									scope="col"
									className={`whitespace-nowrap px-4 py-3 ${column.headerClassName ?? ""}`}
								>
									{column.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-sand-200/70">
						{rows.map((row, rowIndex) => (
							<tr
								key={getRowKey ? getRowKey(row, rowIndex) : row.id ?? rowIndex}
								className="odd:bg-sand-50/70 hover:bg-sand-100/70"
							>
								{columns.map((column) => (
									<td
										key={column.key}
										className={`px-4 py-3 text-ink-900 ${column.cellClassName ?? ""}`}
									>
										{renderCell(column, row)}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="grid gap-3 md:hidden">
				{rows.map((row, rowIndex) => (
					<article
						key={getRowKey ? getRowKey(row, rowIndex) : row.id ?? rowIndex}
						className="rounded-2xl border border-sand-200 bg-surface p-4 shadow-sm"
					>
						<dl className="grid gap-3">
							{columns.map((column) => (
								<div
									key={column.key}
									className="grid grid-cols-[minmax(6rem,0.8fr)_minmax(0,1.2fr)] gap-3"
								>
									<dt className="text-xs font-semibold text-ink-600">
										{column.mobileLabel ?? column.header}
									</dt>
									<dd className="min-w-0 break-words text-right text-sm text-ink-900">
										{renderCell(column, row)}
									</dd>
								</div>
							))}
						</dl>
					</article>
				))}
			</div>
		</div>
	);
}

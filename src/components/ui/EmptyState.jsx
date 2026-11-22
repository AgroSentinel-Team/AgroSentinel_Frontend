export default function EmptyState({
	icon,
	title,
	description,
	action,
	className = "",
}) {
	return (
		<div
			className={`flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-sand-200 bg-surface/70 px-5 py-8 text-center ${className}`}
		>
			{icon && (
				<div
					aria-hidden="true"
					className="mb-3 flex size-11 items-center justify-center rounded-full bg-sand-100 text-forest-700"
				>
					{icon}
				</div>
			)}
			<h3 className="text-base font-semibold text-ink-900">{title}</h3>
			{description && (
				<p className="mt-1 max-w-md text-sm text-ink-600">{description}</p>
			)}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}

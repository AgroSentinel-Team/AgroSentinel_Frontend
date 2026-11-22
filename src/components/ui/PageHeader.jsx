export default function PageHeader({
	title,
	description,
	breadcrumbs = [],
	actions,
	className = "",
}) {
	return (
		<header className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
			<div className="min-w-0">
				{breadcrumbs.length > 0 && (
					<nav aria-label="Ruta de navegación" className="mb-2">
						<ol className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
							{breadcrumbs.map((item, index) => {
								const isCurrent = index === breadcrumbs.length - 1;
								return (
									<li key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
										{item.href && !isCurrent ? (
											<a href={item.href} className="hover:text-forest-700 hover:underline">
												{item.label}
											</a>
										) : (
											<span aria-current={isCurrent ? "page" : undefined}>
												{item.label}
											</span>
										)}
										{!isCurrent && <span aria-hidden="true">/</span>}
									</li>
								);
							})}
						</ol>
					</nav>
				)}
				<h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-[30px]">
					{title}
				</h1>
				{description && (
					<p className="mt-1.5 max-w-3xl text-sm text-ink-600">{description}</p>
				)}
			</div>
			{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
		</header>
	);
}

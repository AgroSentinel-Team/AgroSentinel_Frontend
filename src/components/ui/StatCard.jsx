import Card from "./Card";

const accents = {
	forest: {
		line: "from-forest-500 to-ocean-500",
		icon: "bg-success-soft text-forest-700",
	},
	ocean: {
		line: "from-ocean-500 to-forest-500",
		icon: "bg-info-soft text-ocean-700",
	},
	gold: {
		line: "from-gold-500 to-gold-600",
		icon: "bg-gold-100 text-forest-900",
	},
};

export default function StatCard({
	label,
	value,
	icon,
	detail,
	accent = "forest",
	className = "",
}) {
	const colors = accents[accent] ?? accents.forest;

	return (
		<Card
			interactive
			className={`relative overflow-hidden p-4 pt-5 sm:p-5 sm:pt-6 ${className}`}
		>
			<div
				aria-hidden="true"
				className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${colors.line}`}
			/>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-sm font-medium text-ink-600">{label}</p>
					<p className="mt-2 break-words text-2xl font-bold tabular-nums text-ink-900">
						{value}
					</p>
					{detail != null && (
						<div className="mt-1 text-sm text-ink-600">{detail}</div>
					)}
				</div>
				{icon && (
					<div
						aria-hidden="true"
						className={`flex size-11 shrink-0 items-center justify-center rounded-full ${colors.icon}`}
					>
						{icon}
					</div>
				)}
			</div>
		</Card>
	);
}

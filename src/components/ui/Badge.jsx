const variants = {
	success: "bg-success-soft text-forest-700",
	warning: "bg-warning-soft text-ink-900",
	error: "bg-error-soft text-error-text",
	info: "bg-info-soft text-ocean-700",
	neutral: "bg-sand-100 text-ink-600",
	primary: "bg-pine-700 text-white",
};

export default function Badge({
	variant = "neutral",
	size = "md",
	dot = false,
	className = "",
	children,
	...props
}) {
	const sizes = {
		sm: "px-2 py-0.5 text-xs",
		md: "px-2.5 py-1 text-xs",
	};

	return (
		<span
			className={`inline-flex w-fit items-center gap-1.5 rounded-full font-semibold ${variants[variant] ?? variants.neutral} ${sizes[size] ?? sizes.md} ${className}`}
			{...props}
		>
			{dot && (
				<span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
			)}
			{children}
		</span>
	);
}

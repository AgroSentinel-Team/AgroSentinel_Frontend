export default function Card({
	as: Component = "section",
	variant = "default",
	interactive = false,
	className = "",
	children,
	...props
}) {
	const variants = {
		default: "border border-sand-200/80 bg-surface",
		muted: "border border-sand-200/70 bg-sand-50",
		glass: "border border-surface/40 bg-surface/70 backdrop-blur-xl",
	};

	return (
		<Component
			className={`rounded-2xl shadow-[var(--agro-shadow-card)] ${variants[variant] ?? variants.default} ${interactive ? "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg" : ""} ${className}`}
			{...props}
		>
			{children}
		</Component>
	);
}

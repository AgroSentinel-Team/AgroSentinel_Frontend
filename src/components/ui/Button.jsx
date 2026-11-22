const variants = {
	primary:
		"bg-gradient-to-r from-gold-500 to-gold-600 text-pine-900 shadow-sm shadow-gold-600/20 hover:brightness-105 hover:shadow-md hover:shadow-gold-600/30",
	secondary: "bg-pine-700 text-white hover:bg-pine-900",
	ghost: "border border-sand-200 bg-transparent text-ink-600 hover:bg-sand-100",
	outline: "border border-forest-500/30 bg-surface text-forest-700 hover:bg-sand-50",
	danger: "bg-error text-white hover:brightness-95",
};

const sizes = {
	sm: "min-h-9 px-3 text-sm",
	md: "min-h-11 px-4 text-sm",
	lg: "min-h-12 px-5 text-base",
	icon: "size-11 p-0",
};

export default function Button({
	variant = "primary",
	size = "md",
	loading = false,
	disabled = false,
	leftIcon,
	rightIcon,
	type = "button",
	className = "",
	children,
	...props
}) {
	return (
		<button
			type={type}
			disabled={disabled || loading}
			aria-busy={loading || undefined}
			className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${className}`}
			{...props}
		>
			{loading ? (
				<span
					aria-hidden="true"
					className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
				/>
			) : (
				leftIcon
			)}
			{children}
			{!loading && rightIcon}
		</button>
	);
}

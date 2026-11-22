export default function Skeleton({
	variant = "text",
	width,
	height,
	className = "",
	label = "Cargando contenido",
}) {
	const shapes = {
		text: "h-4 w-full rounded-md",
		circle: "size-10 rounded-full",
		rect: "h-24 w-full rounded-xl",
	};
	const customStyle = {
		...(width != null ? { width } : {}),
		...(height != null ? { height } : {}),
	};

	return (
		<div
			role="status"
			aria-label={label}
			className={`shimmer ${shapes[variant] ?? shapes.text} ${className}`}
			style={customStyle}
		/>
	);
}

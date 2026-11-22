import { useId } from "react";

export default function Textarea({
	label,
	hint,
	error,
	id,
	name,
	className = "",
	wrapperClassName = "",
	...props
}) {
	const generatedId = useId();
	const textareaId = id ?? name ?? generatedId;
	const hintId = `${textareaId}-hint`;
	const errorId = `${textareaId}-error`;
	const describedBy = [
		props["aria-describedby"],
		hint ? hintId : null,
		error ? errorId : null,
	]
		.filter(Boolean)
		.join(" ") || undefined;

	return (
		<div className={`grid gap-1.5 ${wrapperClassName}`}>
			{label && (
				<label htmlFor={textareaId} className="text-[13px] font-semibold text-ink-600">
					{label}
				</label>
			)}
			<textarea
				id={textareaId}
				name={name}
				aria-invalid={error ? true : undefined}
				aria-describedby={describedBy}
				className={`min-h-28 w-full resize-y rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink-900 shadow-sm outline-none placeholder:text-ink-600 focus-visible:border-gold-600 focus-visible:ring-2 focus-visible:ring-gold-500/25 disabled:cursor-not-allowed disabled:bg-sand-100 disabled:text-ink-600 ${error ? "border-error" : "border-sand-200"} ${className}`}
				{...props}
			/>
			{hint && !error && (
				<p id={hintId} className="text-xs text-ink-600">
					{hint}
				</p>
			)}
			{error && (
				<p id={errorId} className="text-xs font-medium text-error-text">
					{error}
				</p>
			)}
		</div>
	);
}

import { useEffect, useId } from "react";

export default function Modal({
	isOpen,
	onClose,
	title,
	description,
	ariaLabel,
	children,
	footer,
	size = "lg",
	closeOnBackdrop = true,
	className = "",
}) {
	const titleId = useId();
	const descriptionId = useId();
	const sizes = {
		sm: "max-w-md",
		md: "max-w-xl",
		lg: "max-w-3xl",
		xl: "max-w-5xl",
	};

	useEffect(() => {
		if (!isOpen) return undefined;

		const previousOverflow = document.body.style.overflow;
		const handleKeyDown = (event) => {
			if (event.key === "Escape") onClose?.();
		};

		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className="modal-backdrop-enter fixed inset-0 z-[100] flex items-end justify-center bg-pine-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
			onClick={(event) => {
				if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
			}}
		>
			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby={title ? titleId : undefined}
				aria-describedby={description ? descriptionId : undefined}
				aria-label={!title ? ariaLabel : undefined}
				className={`modal-panel-enter flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-surface/50 bg-surface/90 shadow-2xl backdrop-blur-xl sm:rounded-3xl ${sizes[size] ?? sizes.lg} ${className}`}
			>
				{(title || description || onClose) && (
					<header className="flex items-start justify-between gap-4 border-b border-sand-200/70 px-5 py-4 sm:px-6">
						<div className="min-w-0">
							{title && (
								<h2 id={titleId} className="text-lg font-bold text-ink-900">
									{title}
								</h2>
							)}
							{description && (
								<p id={descriptionId} className="mt-1 text-sm text-ink-600">
									{description}
								</p>
							)}
						</div>
						{onClose && (
							<button
								type="button"
								onClick={onClose}
								aria-label="Cerrar diálogo"
								className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-xl text-ink-600 hover:bg-sand-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-gold-600"
							>
								<span aria-hidden="true">&times;</span>
							</button>
						)}
					</header>
				)}
				<div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
				{footer && (
					<footer className="border-t border-sand-200/70 px-5 py-4 sm:px-6">
						{footer}
					</footer>
				)}
			</section>
		</div>
	);
}

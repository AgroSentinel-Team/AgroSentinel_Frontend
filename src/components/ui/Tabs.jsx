import { useId, useRef, useState } from "react";

export default function Tabs({
	tabs,
	value,
	defaultValue,
	onChange,
	className = "",
}) {
	const generatedId = useId();
	const tabRefs = useRef([]);
	const firstEnabled = tabs.find((tab) => !tab.disabled)?.id;
	const [internalValue, setInternalValue] = useState(defaultValue ?? firstEnabled);
	const selectedValue = value !== undefined ? value : internalValue;
	const selectedTab = tabs.find((tab) => tab.id === selectedValue) ?? tabs[0];

	const selectTab = (nextValue) => {
		if (value === undefined) setInternalValue(nextValue);
		onChange?.(nextValue);
	};

	const handleKeyDown = (event, index) => {
		const enabledIndices = tabs
			.map((tab, tabIndex) => (tab.disabled ? -1 : tabIndex))
			.filter((tabIndex) => tabIndex >= 0);
		const position = enabledIndices.indexOf(index);
		let nextPosition;

		if (event.key === "ArrowRight") nextPosition = (position + 1) % enabledIndices.length;
		else if (event.key === "ArrowLeft") {
			nextPosition = (position - 1 + enabledIndices.length) % enabledIndices.length;
		} else if (event.key === "Home") nextPosition = 0;
		else if (event.key === "End") nextPosition = enabledIndices.length - 1;
		else return;

		event.preventDefault();
		const nextIndex = enabledIndices[nextPosition];
		selectTab(tabs[nextIndex].id);
		tabRefs.current[nextIndex]?.focus();
	};

	if (!tabs.length) return null;

	return (
		<div className={className}>
			<div
				role="tablist"
				aria-label="Secciones"
				className="flex gap-1 overflow-x-auto border-b border-sand-200"
			>
				{tabs.map((tab, index) => {
					const isSelected = tab.id === selectedTab?.id;
					const tabId = `${generatedId}-tab-${tab.id}`;
					return (
						<button
							key={tab.id}
							ref={(node) => {
								tabRefs.current[index] = node;
							}}
							id={tabId}
							type="button"
							role="tab"
							aria-selected={isSelected}
							aria-controls={`${generatedId}-panel`}
							tabIndex={isSelected ? 0 : -1}
							disabled={tab.disabled}
							onClick={() => selectTab(tab.id)}
							onKeyDown={(event) => handleKeyDown(event, index)}
							className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold-600 disabled:cursor-not-allowed disabled:opacity-50 ${isSelected ? "border-gold-600 text-forest-700" : "border-transparent text-ink-600 hover:border-sand-400 hover:text-ink-900"}`}
						>
							{tab.label}
						</button>
					);
				})}
			</div>
			<div
				id={`${generatedId}-panel`}
				role="tabpanel"
				aria-labelledby={`${generatedId}-tab-${selectedTab?.id}`}
				tabIndex={0}
				className="page-enter outline-none"
			>
				{selectedTab?.content}
			</div>
		</div>
	);
}

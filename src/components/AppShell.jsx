import { Menu, MoreHorizontal, Search, X } from "lucide-react";
import { useId } from "react";
import BrandLogo from "./BrandLogo";
import DashboardRoleSwitcher from "./DashboardRoleSwitcher";
import LogoutButton from "./LogoutButton";
import NotificationInbox from "./NotificationInbox";
import ThemeToggle from "./ThemeToggle";

function getItemValue(item) {
	return item.id ?? item.label;
}

function getInitials(name) {
	return (
		String(name ?? "")
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join("") || "—"
	);
}

export default function AppShell({
	navigation,
	activeTab,
	onNavigate,
	mobileOpen,
	onMobileOpenChange,
	userName,
	userRole,
	userInitials,
	brandTitle = "AgroSentinel",
	brandSubtitle,
	sidebarFooter,
	headerActions,
	children,
	contentClassName = "",
}) {
	const navigationId = useId();
	const items = navigation ?? [];
	const visibleBottomItems = items.slice(0, 4);
	const activeItem = items.find((item) => getItemValue(item) === activeTab);
	const closeDrawer = () => onMobileOpenChange?.(false);

	const renderNavigationItem = (item) => {
		const value = getItemValue(item);
		const isActive = value === activeTab;
		const Icon = item.icon;

		return (
			<button
				key={value}
				type="button"
				onClick={() => {
					onNavigate(value);
					closeDrawer();
				}}
				aria-current={isActive ? "page" : undefined}
				className={`group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 ${
					isActive
						? "bg-gradient-to-r from-gold-500 to-gold-600 font-semibold text-pine-900 shadow-md shadow-gold-600/20"
						: "text-white/75 hover:bg-white/10 hover:text-white"
				}`}
			>
				{isActive && (
					<span
						aria-hidden="true"
						className="absolute inset-y-2 left-0 w-1 rounded-full bg-white/80"
					/>
				)}
				{Icon && (
					<Icon
						size={18}
						strokeWidth={1.9}
						className={`shrink-0 ${isActive ? "text-forest-900" : "text-gold-300"}`}
					/>
				)}
				<span className="min-w-0 truncate">{item.label}</span>
			</button>
		);
	};

	return (
		<div className="flex min-h-dvh min-w-0 overflow-x-clip bg-sand-50 text-ink-900">
			{mobileOpen && (
				<button
					type="button"
					aria-label="Cerrar menú de navegación"
					onClick={closeDrawer}
					className="fixed inset-0 z-50 cursor-default bg-pine-900/50 backdrop-blur-sm lg:hidden"
				/>
			)}

			<aside
				id={navigationId}
				className={`agro-brand-overlay fixed inset-y-0 left-0 z-[60] flex w-72 shrink-0 flex-col overflow-hidden border-r border-white/10 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:translate-x-0 ${
					mobileOpen ? "translate-x-0" : "-translate-x-full"
				}`}
				style={{
					paddingTop: "var(--agro-safe-top)",
					paddingBottom: "var(--agro-safe-bottom)",
				}}
				aria-label="Menú principal"
			>
				<div className="flex min-h-[4.5rem] items-center justify-between gap-3 border-b border-white/15 px-5">
					<div className="flex min-w-0 items-center gap-3">
						<BrandLogo className="size-10 rounded-xl" />
						<div className="min-w-0">
							<p className="truncate text-sm font-bold tracking-wide text-white">
								{brandTitle}
							</p>
							{brandSubtitle && (
								<p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wider text-white/65">
									{brandSubtitle}
								</p>
							)}
						</div>
					</div>
					<button
						type="button"
						onClick={closeDrawer}
						aria-label="Cerrar menú"
						className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-white/75 transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-gold-300 lg:hidden"
					>
						<X size={20} />
					</button>
				</div>

				<nav
					aria-label="Navegación principal"
					className="flex-1 space-y-1 overflow-y-auto p-3"
				>
					{items.map((item) => renderNavigationItem(item))}
				</nav>
				<div className="space-y-3 border-t border-white/15 p-3">
					<DashboardRoleSwitcher />
					<LogoutButton className="w-full justify-start border border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white [&>span]:inline-flex" />
					{sidebarFooter && (
						<div className="px-1 pt-1 text-center text-xs leading-relaxed text-white/60">
							{sidebarFooter}
						</div>
					)}
				</div>
			</aside>

			<div className="flex min-h-dvh min-w-0 flex-1 flex-col">
				<header
					className="sticky top-0 z-30 border-b border-surface/40 bg-surface/70 px-3 pb-3 pt-[calc(0.75rem+var(--agro-safe-top))] shadow-sm backdrop-blur-xl sm:px-5 lg:px-7"
				>
					<div className="flex min-h-11 min-w-0 items-center justify-between gap-2 sm:gap-4">
						<div className="flex min-w-0 items-center gap-2.5">
							<button
								type="button"
								onClick={() => onMobileOpenChange?.(!mobileOpen)}
								aria-label={mobileOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
								aria-expanded={mobileOpen}
								aria-controls={navigationId}
								className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-sand-200 bg-surface text-forest-700 transition-all duration-200 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-gold-600 lg:hidden"
							>
								<Menu size={20} />
							</button>
							<p className="min-w-0 truncate text-sm font-semibold text-ink-900 sm:text-base">
								<span className="hidden text-ink-600 sm:inline">{brandTitle}</span>
								<span className="hidden px-2 text-sand-400 sm:inline">/</span>
								{activeItem?.label ?? activeTab}
							</p>
						</div>

						<div className="flex min-w-0 max-w-[calc(100%-3.5rem)] flex-1 flex-wrap items-center justify-end gap-1.5 sm:gap-3">
							{headerActions && (
								<div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1.5 sm:gap-3">
									{headerActions}
								</div>
							)}
							<ThemeToggle />
							<NotificationInbox />
							<div className="hidden max-w-36 text-right leading-tight sm:block">
								<p className="truncate text-xs font-semibold text-ink-900">
									{userName || "Usuario"}
								</p>
								{userRole && (
									<p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-forest-700">
										{userRole}
									</p>
								)}
							</div>
							<div
								aria-label={userName || "Perfil de usuario"}
								title={userName || undefined}
								className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold-300 bg-gradient-to-br from-pine-700 to-navy-700 text-xs font-bold text-white shadow-sm"
							>
								{userInitials ?? getInitials(userName)}
							</div>
						</div>
					</div>
					<div className="relative mt-3 md:hidden">
						<Search
							aria-hidden="true"
							size={17}
							className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600"
						/>
						<input
							type="search"
							aria-label="Buscar en el panel"
							placeholder="Buscar en el panel"
							className="min-h-11 w-full rounded-xl border border-sand-200 bg-surface/80 pl-10 pr-3 text-sm text-ink-900 outline-none placeholder:text-ink-600 focus-visible:border-gold-600 focus-visible:ring-2 focus-visible:ring-gold-500/25"
						/>
					</div>
					<div className="relative mt-3 hidden md:block">
						<Search
							aria-hidden="true"
							size={17}
							className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600"
						/>
						<input
							type="search"
							aria-label="Buscar en el panel"
							placeholder="Buscar en el panel"
							className="min-h-10 w-full max-w-sm rounded-xl border border-sand-200 bg-surface/80 pl-10 pr-3 text-sm text-ink-900 outline-none placeholder:text-ink-600 focus-visible:border-gold-600 focus-visible:ring-2 focus-visible:ring-gold-500/25"
						/>
					</div>
				</header>

				<main
					className={`min-h-0 min-w-0 flex-1 overflow-y-auto px-3 pb-[calc(6rem+var(--agro-safe-bottom))] pt-4 sm:px-5 sm:pt-6 lg:px-7 lg:pb-7 ${contentClassName}`}
				>
					{children}
				</main>
			</div>

			<nav
				aria-label="Navegación rápida"
				className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-200/80 bg-surface/90 px-2 pt-1.5 shadow-[0_-8px_24px_rgba(15,46,34,.08)] backdrop-blur-xl lg:hidden"
				style={{ paddingBottom: "calc(0.375rem + var(--agro-safe-bottom))" }}
			>
				<div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
					{visibleBottomItems.map((item) => {
						const value = getItemValue(item);
						const Icon = item.icon;
						const isActive = value === activeTab;
						return (
							<button
								key={value}
								type="button"
								onClick={() => {
									onNavigate(value);
									closeDrawer();
								}}
								aria-current={isActive ? "page" : undefined}
								className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-gold-600 ${
									isActive ? "text-forest-700" : "text-ink-600 hover:bg-sand-100"
								}`}
							>
								{Icon && <Icon aria-hidden="true" size={18} />}
								<span className="max-w-full truncate">{item.label}</span>
							</button>
						);
					})}
					<button
						type="button"
						onClick={() => onMobileOpenChange?.(!mobileOpen)}
						aria-label="Más opciones de navegación"
						aria-expanded={mobileOpen}
						aria-controls={navigationId}
						className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-gold-600 ${
							mobileOpen || !visibleBottomItems.some((item) => getItemValue(item) === activeTab)
								? "text-forest-700"
								: "text-ink-600 hover:bg-sand-100"
						}`}
					>
						<MoreHorizontal aria-hidden="true" size={20} />
						<span>Más</span>
					</button>
				</div>
			</nav>
		</div>
	);
}

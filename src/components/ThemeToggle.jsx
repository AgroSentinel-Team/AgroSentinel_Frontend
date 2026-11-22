import { Moon, Sun } from "lucide-react";
import { useTheme } from "../services/themeService";

export default function ThemeToggle({ className = "" }) {
	const { isDark, toggleTheme } = useTheme();
	const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

	return (
		<button
			type="button"
			onClick={toggleTheme}
			aria-label={label}
			aria-pressed={isDark}
			title={label}
			className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-sand-200 bg-surface text-forest-700 shadow-sm transition-all duration-200 hover:border-gold-500 hover:bg-sand-100 hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 ${className}`}
		>
			{isDark ? <Sun size={19} className="text-gold-500" /> : <Moon size={19} />}
		</button>
	);
}

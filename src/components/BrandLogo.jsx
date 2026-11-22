// Versión de 256 px: se muestra a 40–56 px y el original pesa 1 MB.
import logo from '../assets/logo-256.png';

export default function BrandLogo({ className = '' }) {
    return (
        <img
            src={logo}
            alt="Logo de AgroSentinel"
            className={`shrink-0 rounded-xl bg-gradient-to-br from-sand-50 to-gold-100 p-0.5 object-contain ring-1 ring-gold-300/70 shadow-sm ${className}`}
            loading="eager"
        />
    );
}

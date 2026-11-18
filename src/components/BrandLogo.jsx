import logo from '../assets/logo.png';

export default function BrandLogo({ className = '' }) {
    return (
        <img
            src={logo}
            alt="Logo de AgroSentinel"
            className={`shrink-0 rounded-lg bg-white p-0.5 object-contain ${className}`}
            loading="eager"
        />
    );
}

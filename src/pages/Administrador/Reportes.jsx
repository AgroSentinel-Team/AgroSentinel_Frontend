import { useState } from 'react';
import { BarChart3, CheckCircle2, Download, FileText } from 'lucide-react';

const reports = ['Rendimiento de Cosecha', 'Uso de Maquinaria', 'Gastos de Inventario'];

export default function Reportes() {
	const [downloaded, setDownloaded] = useState('');
	const download = (report, format) => { setDownloaded(`${report} · ${format}`); window.setTimeout(() => setDownloaded(''), 2500); };
	return <section className="space-y-4"><div><h2 className="text-[14px] font-semibold text-white">Reportes y Analíticas</h2><p className="mt-1 text-[10px] text-gray-400">Descarga los indicadores operativos de AgroSentinel.</p></div>{downloaded && <div className="flex items-center gap-2 rounded-md border border-green-500/20 bg-green-500/10 px-3 py-2 text-[10px] text-green-400"><CheckCircle2 size={14} /> Preparando {downloaded}...</div>}<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{reports.map((report) => <article key={report} className="rounded-xl border border-white/10 bg-[#292929] p-5"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-400"><BarChart3 size={24} /></div><h3 className="text-[12px] font-medium text-white">{report}</h3><p className="mb-4 mt-1 text-[9px] text-gray-400">Actualizado hoy · 23 Septiembre 2026</p><div className="flex gap-2"><button type="button" onClick={() => download(report, 'PDF')} className="flex flex-1 items-center justify-center gap-1 rounded bg-white/5 py-2 text-[10px] text-gray-300 hover:bg-white/10"><FileText size={12} /> PDF</button><button type="button" onClick={() => download(report, 'Excel')} className="flex flex-1 items-center justify-center gap-1 rounded bg-white/5 py-2 text-[10px] text-gray-300 hover:bg-white/10"><Download size={12} /> Excel</button></div></article>)}</div></section>;
}

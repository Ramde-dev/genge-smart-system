export default function AnalyticsCard({ title, children }) {
  return (
    <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-200 shadow-sm">
      {/* Title section with professional spacing */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
        {title}
      </h3>
      
      {/* Container for the Recharts content */}
      <div className="h-72 w-full">
        {children}
      </div>
    </div>
  );
}
export default function Badge({ children, pulse = true, className = '' }) {
  return (
    <div 
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full 
        bg-primary/10 dark:bg-primary/20 border border-primary/20 
        text-primary font-bold text-xs uppercase tracking-widest
        ${className}
      `}
    >
      {pulse && (
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
      <span>{children}</span>
    </div>
  )
}


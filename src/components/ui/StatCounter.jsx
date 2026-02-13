export default function StatCounter({ value, label, className = '' }) {
  return (
    <div className={`text-center sm:text-left min-w-[90px] ${className}`}>
      <p className="text-2xl sm:text-3xl font-bold text-secondary dark:text-white">
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </p>
    </div>
  )
}


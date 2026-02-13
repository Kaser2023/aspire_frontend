export default function GlassCard({ 
  children, 
  className = '', 
  hover3d = false,
  as: Component = 'div',
  ...props 
}) {
  const baseClasses = 'glass dark:glass-dark rounded-2xl shadow-2xl shadow-primary/10'
  const hoverClasses = hover3d 
    ? 'perspective-container card-3d hover:shadow-primary/20 transition-all duration-700' 
    : ''

  return (
    <Component 
      className={`${baseClasses} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}


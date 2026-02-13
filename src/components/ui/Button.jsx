import { Link } from 'react-router-dom'

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  to,
  href,
  className = '',
  ...props 
}) {
  const baseClasses = 'font-bold rounded-xl flex items-center justify-center gap-3 transform hover:-translate-y-1 transition-all duration-500'
  
  const variants = {
    primary: 'bg-primary text-white shadow-xl shadow-primary/40 hover:shadow-primary/60 hover:scale-105',
    secondary: 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 backdrop-blur-sm',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-3 md:px-8 md:py-4 text-base md:text-lg',
    lg: 'px-8 py-4 md:px-10 md:py-5 text-lg md:text-xl',
  }

  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    )
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}


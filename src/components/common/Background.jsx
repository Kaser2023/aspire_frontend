import pattern1 from '../../assets/images/pattern-1.png'
import pattern2 from '../../assets/images/pattern-2.jpg'

export default function Background() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Base Background Color */}
      <div className="absolute inset-0 bg-background-light dark:bg-background-dark transition-colors duration-500" />
      
      {/* Main tropical pattern background */}
      <div 
        className="absolute inset-0 opacity-[0.15] dark:opacity-[0.20]"
        style={{
          backgroundImage: `url(${pattern1})`,
          backgroundSize: '500px 500px',
          backgroundRepeat: 'repeat',
          backgroundPosition: '0 0',
        }}
      />
      
      {/* Secondary tropical pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.10] dark:opacity-[0.15]"
        style={{
          backgroundImage: `url(${pattern2})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Gradient Orbs */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] animate-pulse-slow"
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-900/20 rounded-full blur-[120px]"
      />
    </div>
  )
}

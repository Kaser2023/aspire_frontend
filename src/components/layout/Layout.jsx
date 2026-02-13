import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import Background from '../common/Background'

export default function Layout() {
  return (
    <>
      <Background />
      <Navbar />
      <Outlet />
      <Footer />

      {/* Decorative Elements */}
      <div className="fixed bottom-10 left-10 w-20 h-20 opacity-20 pointer-events-none z-0">
        <svg 
          className="w-full h-full text-primary animate-pulse" 
          fill="none" 
          viewBox="0 0 100 100"
        >
          <path d="M50 0L100 50L50 100L0 50L50 0Z" fill="currentColor" />
        </svg>
      </div>
      <div className="fixed top-32 right-10 w-12 h-12 opacity-20 pointer-events-none z-0">
        <svg 
          className="w-full h-full text-secondary dark:text-white animate-bounce" 
          fill="currentColor" 
          viewBox="0 0 100 100"
        >
          <circle cx="50" cy="50" r="50" />
        </svg>
      </div>
    </>
  )
}


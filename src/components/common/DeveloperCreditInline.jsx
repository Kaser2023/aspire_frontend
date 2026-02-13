import { useLanguage } from '../../hooks/useLanguage'

export default function DeveloperCreditInline() {
  const { language } = useLanguage()

  const developerCredit =
    language === 'ar'
      ? 'تم تطوير الموقع بواسطة عبدالله القرشي'
      : 'Developed by Abdullah Alqurashi'

  return (
    <div className="pt-2">
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap justify-center md:justify-end">
        <span className="text-center">{developerCredit}</span>
        <a
          href="https://github.com/Kaser2023"
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-500"
          aria-label="GitHub"
          title="GitHub"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.43-4.04-1.43-.55-1.39-1.34-1.77-1.34-1.77-1.1-.76.08-.74.08-.74 1.21.09 1.85 1.24 1.85 1.24 1.08 1.84 2.83 1.31 3.52 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.91 0-1.3.46-2.36 1.23-3.2-.13-.3-.53-1.53.11-3.19 0 0 1.01-.32 3.3 1.22a11.5 11.5 0 0 1 6.01 0c2.28-1.54 3.29-1.22 3.29-1.22.65 1.66.25 2.89.12 3.19.76.84 1.22 1.9 1.22 3.2 0 4.59-2.81 5.61-5.49 5.91.43.37.82 1.11.82 2.23v3.31c0 .32.21.7.82.58A12 12 0 0 0 12 .5z" />
          </svg>
        </a>
        <a
          href="https://www.linkedin.com/in/abdullahalqurashin/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-500"
          aria-label="LinkedIn"
          title="LinkedIn"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9h4v12H3V9Zm7 0h3.83v1.7h.05c.53-1.01 1.84-2.08 3.79-2.08 4.05 0 4.8 2.66 4.8 6.11V21h-4v-5.49c0-1.31-.02-2.99-1.82-2.99-1.82 0-2.1 1.42-2.1 2.89V21h-4V9Z" />
          </svg>
        </a>
        <a
          href="https://wa.me/905379133220"
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-500"
          aria-label="WhatsApp"
          title="WhatsApp: +905379133220"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .17 5.33.17 11.89c0 2.09.55 4.14 1.59 5.95L0 24l6.34-1.66a11.83 11.83 0 0 0 5.72 1.46h.01c6.56 0 11.89-5.33 11.89-11.89 0-3.17-1.23-6.15-3.44-8.43ZM12.07 21.8h-.01a9.8 9.8 0 0 1-4.99-1.37l-.36-.21-3.76.99 1-3.67-.24-.38a9.84 9.84 0 0 1-1.51-5.27C2.2 6.44 6.62 2.02 12.07 2.02c2.63 0 5.1 1.02 6.96 2.88a9.8 9.8 0 0 1 2.88 6.97c0 5.45-4.43 9.93-9.84 9.93Zm5.44-7.4c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.41-1.47-.89-.79-1.5-1.76-1.67-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.2 3.07.15.2 2.08 3.18 5.05 4.46.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z" />
          </svg>
        </a>
      </div>
    </div>
  )
}

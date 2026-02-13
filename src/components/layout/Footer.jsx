import { Link } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import logoImage from '../../assets/images/logo.png'

export default function Footer() {
  const { t, language } = useLanguage()
  const currentYear = new Date().getFullYear()
  const copyrightText =
    language === 'ar'
      ? `© ${currentYear} أكاديمية أسباير. جميع الحقوق محفوظة.`
      : `© ${currentYear} ASPIRE Academy. All rights reserved.`
  const developerCredit =
    language === 'ar'
      ? 'تم تطوير الموقع بواسطة عبدالله القرشي'
      : 'Developed by Abdullah Alqurashi'

  return (
    <footer className="relative z-10 w-full py-10 md:py-16 px-4 md:px-6 lg:px-12 mt-12 md:mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="glass dark:glass-dark rounded-2xl p-4 md:p-8 lg:p-12 shadow-2xl shadow-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Logo and Description */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={logoImage} 
                  alt="ASPIRE ACADEMY Logo" 
                  className="h-12 w-auto object-contain"
                />
                <span className="font-bold text-xl tracking-tight text-secondary dark:text-white">
                  ASPIRE <span className="text-primary">ACADEMY</span>
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed max-w-md">
                {t('footer.tagline')}
              </p>
              
              {/* Social Links */}
              <div className="flex items-center gap-4 pt-4">
                <a 
                  href="https://www.instagram.com/dh.aspire?igsh=MWtuZWQzaDlud2hmOQ=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-500"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a 
                  href="https://snapchat.com/t/s92jMHnA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-500"
                  aria-label="Snapchat"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M15.943 11.526c-.111-.303-.323-.465-.564-.599a1 1 0 0 0-.123-.064l-.219-.111c-.752-.399-1.339-.902-1.746-1.498a3.4 3.4 0 0 1-.3-.531c-.034-.1-.032-.156-.008-.207a.3.3 0 0 1 .097-.1c.129-.086.262-.173.352-.231.162-.104.289-.187.371-.245.309-.216.525-.446.66-.702a1.4 1.4 0 0 0 .069-1.16c-.205-.538-.713-.872-1.329-.872a1.8 1.8 0 0 0-.487.065c.006-.368-.002-.757-.035-1.139-.116-1.344-.587-2.048-1.077-2.61a4.3 4.3 0 0 0-1.095-.881C9.764.216 8.92 0 7.999 0s-1.76.216-2.505.641c-.412.232-.782.53-1.097.883-.49.562-.96 1.267-1.077 2.61-.033.382-.04.772-.036 1.138a1.8 1.8 0 0 0-.487-.065c-.615 0-1.124.335-1.328.873a1.4 1.4 0 0 0 .067 1.161c.136.256.352.486.66.701.082.058.21.14.371.246l.339.221a.4.4 0 0 1 .109.11c.026.053.027.11-.012.217a3.4 3.4 0 0 1-.295.52c-.398.583-.968 1.077-1.696 1.472-.385.204-.786.34-.955.8-.128.348-.044.743.28 1.075q.18.189.409.31a4.4 4.4 0 0 0 1 .4.7.7 0 0 1 .202.09c.118.104.102.26.259.488q.12.178.296.3c.33.229.701.243 1.095.258.355.014.758.03 1.217.18.19.064.389.186.618.328.55.338 1.305.802 2.566.802 1.262 0 2.02-.466 2.576-.806.227-.14.424-.26.609-.321.46-.152.863-.168 1.218-.181.393-.015.764-.03 1.095-.258a1.14 1.14 0 0 0 .336-.368c.114-.192.11-.327.217-.42a.6.6 0 0 1 .19-.087 4.5 4.5 0 0 0 1.014-.404c.16-.087.306-.2.429-.336l.004-.005c.304-.325.38-.709.256-1.047m-1.121.602c-.684.378-1.139.337-1.493.565-.3.193-.122.61-.34.76-.269.186-1.061-.012-2.085.326-.845.279-1.384 1.082-2.903 1.082s-2.045-.801-2.904-1.084c-1.022-.338-1.816-.14-2.084-.325-.218-.15-.041-.568-.341-.761-.354-.228-.809-.187-1.492-.563-.436-.24-.189-.39-.044-.46 2.478-1.199 2.873-3.05 2.89-3.188.022-.166.045-.297-.138-.466-.177-.164-.962-.65-1.18-.802-.36-.252-.52-.503-.402-.812.082-.214.281-.295.49-.295a1 1 0 0 1 .197.022c.396.086.78.285 1.002.338q.04.01.082.011c.118 0 .16-.06.152-.195-.026-.433-.087-1.277-.019-2.066.094-1.084.444-1.622.859-2.097.2-.229 1.137-1.22 2.93-1.22 1.792 0 2.732.987 2.931 1.215.416.475.766 1.013.859 2.098.068.788.009 1.632-.019 2.065-.01.142.034.195.152.195a.4.4 0 0 0 .082-.01c.222-.054.607-.253 1.002-.338a1 1 0 0 1 .197-.023c.21 0 .409.082.49.295.117.309-.04.56-.401.812-.218.152-1.003.638-1.18.802-.184.169-.16.3-.139.466.018.14.413 1.991 2.89 3.189.147.073.394.222-.041.464"/>
                  </svg>
                </a>
                <a 
                  href="https://www.tiktok.com/@dh.aspire1?_t=ZS-8xoK6DtFBrj&_r=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-500"
                  aria-label="TikTok"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.6 5.82A4.73 4.73 0 0 1 13.8 2h-3.1v12.02a2.73 2.73 0 1 1-2.73-2.73c.2 0 .4.02.58.06V8.2a5.83 5.83 0 1 0 5.25 5.8V8.1a7.8 7.8 0 0 0 4.57 1.47V6.52c-.62 0-1.24-.24-1.77-.7z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-secondary dark:text-white mb-4">
                {t('footer.quickLinks')}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    to="/" 
                    className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors duration-500 flex items-center gap-2"
                  >
                    {t('nav.home')}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/store" 
                    className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors duration-500 flex items-center gap-2"
                  >
                    {t('nav.store')}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/about" 
                    className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors duration-500 flex items-center gap-2"
                  >
                    {t('nav.about')}
                  </Link>
                </li>
                <li>
                  <a 
                    href="#contact" 
                    className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors duration-500 flex items-center gap-2"
                  >
                    {t('nav.contact')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-secondary dark:text-white mb-4">
                {t('footer.contactUs')}
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                  <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span>{t('footer.location')}</span>
                </li>
                <li className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                  <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                  <a href="mailto:aspireacademydh.sa@gmail.com" className="hover:text-primary transition-colors duration-500">
                    aspireacademydh.sa@gmail.com
                  </a>
                </li>
                <li className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                  <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  <a href="tel:+966541715198" dir="ltr" className="hover:text-primary transition-colors duration-500">
                    0541715198
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-200 dark:border-white/10 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-left">
                {copyrightText}
              </p>
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
          </div>
        </div>
      </div>
    </footer>
  )
}


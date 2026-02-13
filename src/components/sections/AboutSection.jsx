import { useLanguage } from '../../hooks/useLanguage'
import Badge from '../ui/Badge'
import GlassCard from '../ui/GlassCard'

export default function AboutSection() {
  const { t } = useLanguage()

  return (
    <section id="about" className="relative z-10 w-full py-12 md:py-24 px-4 md:px-6 lg:px-12 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="perspective-container">
          <GlassCard hover3d className="p-4 md:p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Content */}
              <div className="space-y-6 order-2 lg:order-1">
                <Badge>
                  {t('about.badge')}
                </Badge>
                
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold leading-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                    {t('about.title')}
                  </span>
                </h2>
                
                <p className="text-sm md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed border-l-4 rtl:border-l-0 rtl:border-r-4 border-primary pl-4 md:pl-6 rtl:pl-0 rtl:pr-4 md:rtl:pr-6">
                  {t('about.description')}
                </p>
              </div>

              {/* Visual */}
              <div className="order-1 lg:order-2 relative h-[400px] lg:h-[500px] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/10 rounded-3xl blur-3xl transform scale-75" />
                <div className="relative z-20 w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/5 dark:to-secondary/20 rounded-3xl flex items-center justify-center animate-float">
                  <div className="text-center space-y-4">
                    {/* Soccer Ball Icon */}
                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary to-yellow-300 rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 animate-float-delayed">
                      <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                      </svg>
                    </div>
                    
                    {/* Founded Card */}
                    <GlassCard className="p-6 backdrop-blur-md">
                      <p className="text-3xl font-black text-primary mb-2">2017</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {t('about.founded')}
                      </p>
                    </GlassCard>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}


import { useLanguage } from '../../hooks/useLanguage'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import StatCounter from '../ui/StatCounter'
import heroImage from '../../assets/images/hero.jpg'

export default function HeroSection() {
  const { t, isRTL } = useLanguage()

  return (
    <main className="relative z-10 w-full min-h-[70vh] md:min-h-screen flex items-center justify-center pt-20 md:pt-24 pb-8 md:pb-12 px-4 md:px-6 lg:px-12">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center min-w-0">
        {/* Content */}
        <div className="space-y-6 md:space-y-8 order-1 lg:order-1 relative min-w-0">
          {/* Background Letter */}
          <div className="hero-letter absolute -left-20 -top-20 text-[200px] opacity-[0.02] dark:opacity-[0.05] pointer-events-none select-none font-serif text-primary">
            أ
          </div>

          {/* Badge */}
          <Badge className="mb-4">
            {t('hero.badge')}
          </Badge>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight">
            {t('hero.title1')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300 drop-shadow-sm">
              {t('hero.title2')}
            </span> <br />
            {t('hero.title3')}
          </h1>

          {/* Description */}
          <p className="text-sm md:text-lg text-gray-600 dark:text-gray-300 max-w-lg leading-relaxed border-l-4 rtl:border-l-0 rtl:border-r-4 border-primary pl-4 md:pl-6 rtl:pl-0 rtl:pr-4 md:rtl:pr-6">
            {t('hero.description')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
            <Button to="/signup">
              <span>{t('hero.cta')}</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
              </svg>
            </Button>
          </div>

          {/* Stats */}
          <div className="pt-6 md:pt-8 flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-8 border-t border-gray-200 dark:border-white/10 mt-6 md:mt-8">
            <StatCounter value="500+" label={t('stats.athletes')} />
            <StatCounter value="50+" label={t('stats.coaches')} />
            <StatCounter value="3" label={t('stats.branches')} />
          </div>
        </div>

        {/* Hero Image */}
        <div className="hero-media order-2 lg:order-2 perspective-container relative h-[350px] sm:h-[450px] md:h-[500px] lg:h-[700px] flex items-center justify-center">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-full blur-3xl transform scale-75 translate-y-20" />
          
          {/* Main Image Card */}
          <div className="card-3d relative w-full h-full flex items-center justify-center animate-float">
            <div className="relative z-20 w-[90%] h-[90%]">
              <img
                src={heroImage}
                alt="Young football player in dynamic pose"
                className="w-full h-full object-cover rounded-3xl shadow-2xl shadow-black/50 mask-image-gradient"
                style={{ objectPosition: 'center top' }}
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background-light dark:from-background-dark via-transparent to-transparent rounded-3xl" />
              
              {/* Trophy Badge */}
              <div className="absolute -right-3 md:-right-8 bottom-10 md:bottom-20 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-yellow-200 to-primary rounded-2xl shadow-lg shadow-primary/40 flex items-center justify-center animate-float-delayed transform rotate-12 border border-white/20 glass dark:glass-dark z-30">
                <svg className="w-16 h-16 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
                </svg>
              </div>
              
              {/* #1 Badge */}
              <div className="absolute -left-2 md:-left-4 top-8 md:top-20 w-20 h-20 md:w-24 md:h-24 bg-secondary/90 dark:bg-white/10 rounded-full shadow-lg flex flex-col items-center justify-center text-center p-2 animate-float glass dark:glass-dark backdrop-blur-md border border-white/10 z-30">
                <span className="text-[10px] md:text-xs text-gray-300 font-bold uppercase">
                  {t('heroBadges.mostAmbitious')}
                </span>
                <span className="text-xl md:text-2xl font-black text-primary">#1</span>
                <span className="text-[9px] md:text-[10px] text-gray-300">
                  {t('heroBadges.inRegion')}
                </span>
              </div>
            </div>
          </div>

          {/* Decorative Circles */}
          <div className="absolute w-[120%] h-[120%] border border-primary/10 rounded-full animate-spin-slow pointer-events-none" />
          <div 
            className="absolute w-[80%] h-[80%] border border-dashed border-primary/20 rounded-full animate-spin-slow pointer-events-none" 
            style={{ animationDirection: 'reverse' }}
          />
        </div>
      </div>
    </main>
  )
}


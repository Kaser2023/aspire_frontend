import { useLanguage } from '../hooks/useLanguage'
import Badge from '../components/ui/Badge'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import heroImage from '../assets/images/hero.jpg'

export default function ProgramsPage() {
  const { t, language } = useLanguage()

  const programs = [
    {
      id: 1,
      title: { en: "Youth Development", ar: "تطوير الشباب" },
      ageRange: { en: "Ages 6-12", ar: "من 6 إلى 12 سنة" },
      description: {
        en: "Building fundamental skills and love for the game in young athletes through fun, engaging training sessions.",
        ar: "بناء المهارات الأساسية وحب اللعبة لدى الرياضيين الصغار من خلال جلسات تدريبية ممتعة وجذابة."
      },
      pricing: [
        { duration: { en: "1 Month", ar: "شهر واحد" }, price: 500, featured: false },
        { duration: { en: "3 Months", ar: "3 أشهر" }, price: 1350, save: "10%", featured: false },
        { duration: { en: "6 Months", ar: "6 أشهر" }, price: 2400, save: "20%", featured: true },
      ],
      features: [
        { en: "Basic football fundamentals", ar: "أساسيات كرة القدم الأساسية" },
        { en: "Coordination and motor skills", ar: "التنسيق والمهارات الحركية" },
        { en: "Teamwork and sportsmanship", ar: "العمل الجماعي والروح الرياضية" },
      ]
    },
    {
      id: 2,
      title: { en: "Elite Training", ar: "التدريب النخبوي" },
      ageRange: { en: "Ages 13-17", ar: "من 13 إلى 17 سنة" },
      description: {
        en: "Advanced training for serious athletes aiming to reach competitive levels and prepare for professional opportunities.",
        ar: "تدريب متقدم للرياضيين الجادين الذين يهدفون إلى الوصول إلى المستويات التنافسية والاستعداد للفرص الاحترافية."
      },
      pricing: [
        { duration: { en: "1 Month", ar: "شهر واحد" }, price: 750, featured: false },
        { duration: { en: "3 Months", ar: "3 أشهر" }, price: 2025, save: "10%", featured: false },
        { duration: { en: "6 Months", ar: "6 أشهر" }, price: 3600, save: "20%", featured: true },
      ],
      features: [
        { en: "Advanced tactical training", ar: "تدريب تكتيكي متقدم" },
        { en: "Physical conditioning programs", ar: "برامج التأهيل البدني" },
        { en: "Competition preparation", ar: "الاستعداد للمنافسة" },
      ]
    },
    {
      id: 3,
      title: { en: "Professional Development", ar: "التطوير الاحترافي" },
      ageRange: { en: "Ages 18+", ar: "18 سنة فما فوق" },
      description: {
        en: "Intensive professional training for athletes ready to take their game to the highest level and pursue professional careers.",
        ar: "تدريب احترافي مكثف للرياضيين المستعدين لرفع مستواهم إلى أعلى مستوى ومتابعة المسارات المهنية."
      },
      pricing: [
        { duration: { en: "1 Month", ar: "شهر واحد" }, price: 1000, featured: false },
        { duration: { en: "3 Months", ar: "3 أشهر" }, price: 2700, save: "10%", featured: false },
        { duration: { en: "6 Months", ar: "6 أشهر" }, price: 4800, save: "20%", featured: true },
      ],
      features: [
        { en: "Elite performance training", ar: "تدريب الأداء النخبوي" },
        { en: "Professional career guidance", ar: "إرشاد المسيرة المهنية" },
        { en: "Club integration support", ar: "دعم الاندماج في الأندية" },
      ]
    },
  ]

  const programFeatures = [
    {
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58A2.01 2.01 0 0 0 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 3.43c0-.81-.48-1.53-1.22-1.85A6.95 6.95 0 0 0 20 14c-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
        </svg>
      ),
      title: { en: "Expert Coaches", ar: "مدربون خبراء" },
      description: { en: "Qualified professional trainers with years of experience", ar: "مدربون محترفون مؤهلون مع سنوات من الخبرة" },
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
        </svg>
      ),
      title: { en: "Modern Facilities", ar: "مرافق حديثة" },
      description: { en: "State-of-the-art training equipment and facilities", ar: "معدات ومرافق تدريبية حديثة" },
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
        </svg>
      ),
      title: { en: "Progress Tracking", ar: "تتبع التقدم" },
      description: { en: "Regular assessments and personalized feedback", ar: "تقييمات منتظمة وملاحظات مخصصة" },
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
        </svg>
      ),
      title: { en: "Match Experience", ar: "تجربة المباراة" },
      description: { en: "Regular friendly matches and competitions", ar: "مباريات ودية ومنافسات منتظمة" },
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 8.57c-.79 0-1.43.64-1.43 1.43s.64 1.43 1.43 1.43 1.43-.64 1.43-1.43-.64-1.43-1.43-1.43z"/>
          <path d="M13 3C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2a.5.5 0 0 0 .4.8H6v3c0 1.1.9 2 2 2h1v3h7v-4.68a7.016 7.016 0 0 0 4-6.32c0-3.86-3.14-7-7-7zm2 11.12V16H9v-1c0-1.1.9-2 2-2h.28a3.45 3.45 0 0 1-1.66-2.14c-.16-.62-.03-1.17.17-1.42.89.06 1.98.55 2.71 1.41.72-.86 1.81-1.35 2.71-1.41.2.25.33.8.17 1.42A3.45 3.45 0 0 1 13.72 13H14c1.1 0 2 .9 2 2v1.12z"/>
        </svg>
      ),
      title: { en: "Mental Training", ar: "التدريب العقلي" },
      description: { en: "Sports psychology and mental strength development", ar: "علم النفس الرياضي وتطوير القوة العقلية" },
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
        </svg>
      ),
      title: { en: "Injury Prevention", ar: "منع الإصابات" },
      description: { en: "Comprehensive injury prevention and recovery programs", ar: "برامج شاملة لمنع الإصابات والتعافي" },
    },
  ]

  const getText = (obj) => obj[language] || obj.en

  return (
    <>
      {/* Hero Section */}
      <section className="relative z-10 w-full min-h-[50vh] md:min-h-[60vh] flex items-center justify-center pt-24 md:pt-32 pb-8 md:pb-12 px-4 md:px-6 lg:px-12">
        <div className="max-w-7xl w-full text-center space-y-4 md:space-y-8">
          <Badge>
            {language === 'ar' ? 'برامج التدريب' : 'Training Programs'}
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight">
            {language === 'ar' ? 'اختر' : 'Choose Your'} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300 drop-shadow-sm">
              {language === 'ar' ? 'مسار التدريب' : 'Training Path'}
            </span>
          </h1>
          <p className="text-sm md:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed px-2">
            {language === 'ar' 
              ? 'اكتشف برامجنا التدريبية الشاملة المصممة لتطوير الرياضيين في كل مرحلة من رحلتهم، من تطوير الشباب إلى التميز الاحترافي.'
              : 'Discover our comprehensive training programs designed to develop athletes at every stage of their journey, from youth development to professional excellence.'
            }
          </p>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className="relative z-10 w-full py-12 md:py-24 px-4 md:px-6 lg:px-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8 md:space-y-12">
            {/* Section Header */}
            <div className="text-center space-y-3 md:space-y-4">
              <Badge>
                {language === 'ar' ? 'برامجنا' : 'Our Programs'}
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-extrabold leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                  {language === 'ar' ? 'برامج التدريب' : 'Training Programs'}
                </span>
              </h2>
              <p className="text-sm md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-2">
                {language === 'ar' 
                  ? 'اختر برنامج التدريب المثالي لرحلتك نحو التميز'
                  : 'Choose the perfect training program for your journey to excellence'
                }
              </p>
            </div>

            {/* Program Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {programs.map((program) => (
                <div key={program.id} className="perspective-container">
                  <GlassCard hover3d className="rounded-3xl overflow-hidden">
                    {/* Image Header */}
                    <div className="relative h-64 overflow-hidden group">
                      <img 
                        src={heroImage} 
                        alt={getText(program.title)}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-2xl font-bold text-white mb-1">
                          {getText(program.title)}
                        </h3>
                        <p className="text-sm text-gray-200">
                          {getText(program.ageRange)}
                        </p>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 space-y-6">
                      {/* Description */}
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {getText(program.description)}
                      </p>

                      {/* Pricing Options */}
                      <div className="space-y-3">
                        {program.pricing.map((tier, idx) => (
                          <div 
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-xl ${
                              tier.featured 
                                ? 'bg-gradient-to-r from-primary/20 to-yellow-300/20 border-2 border-primary/30'
                                : 'bg-primary/10 dark:bg-primary/20'
                            }`}
                          >
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                                {getText(tier.duration)}
                              </p>
                              <p className="text-xl font-bold text-primary">
                                {tier.price.toLocaleString()} <span className="text-sm text-gray-600 dark:text-gray-400">{language === 'ar' ? 'ريال' : 'SAR'}</span>
                              </p>
                              {tier.save && (
                                <p className="text-xs text-green-500">
                                  {language === 'ar' ? `وفر ${tier.save}` : `Save ${tier.save}`}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Features List */}
                      <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                          {program.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                              <span>{getText(feature)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* CTA Button */}
                      <Button className="w-full">
                        <span>{language === 'ar' ? 'سجل الآن' : 'Enroll Now'}</span>
                        <svg className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Button>
                    </div>
                  </GlassCard>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Program Features Section */}
      <section className="relative z-10 w-full py-12 md:py-24 px-4 md:px-6 lg:px-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <GlassCard hover3d className="p-4 md:p-8 lg:p-12">
            <div className="space-y-6 md:space-y-8">
              {/* Section Header */}
              <div className="text-center space-y-3 md:space-y-4">
                <Badge>
                  {language === 'ar' ? 'مميزات البرامج' : 'Program Features'}
                </Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-extrabold leading-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                    {language === 'ar' ? 'ما ستحصل عليه' : 'What You Get'}
                  </span>
                </h2>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {programFeatures.map((feature, idx) => (
                  <GlassCard 
                    key={idx} 
                    className={`p-6 backdrop-blur-md hover:shadow-lg shadow-primary/10 transition-all duration-500 ${idx % 2 === 0 ? 'animate-float' : 'animate-float-delayed'}`}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary to-yellow-300 rounded-full flex items-center justify-center text-white">
                        {feature.icon}
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 font-bold">
                        {getText(feature.title)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getText(feature.description)}
                      </p>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 w-full py-12 md:py-24 px-4 md:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <GlassCard hover3d className="p-6 md:p-8 lg:p-16">
            <div className="text-center space-y-4 md:space-y-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-extrabold leading-tight">
                {language === 'ar' ? 'مستعد للبدء' : 'Ready to Start'} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                  {language === 'ar' ? 'رحلتك؟' : 'Your Journey?'}
                </span>
              </h2>
              <p className="text-sm md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-2">
                {language === 'ar'
                  ? 'انضم إلى أكاديمية أسباير اليوم واتخذ الخطوة الأولى نحو أن تصبح بطلاً. مدربونا الخبراء مستعدون لإرشادك في طريقك نحو التميز.'
                  : 'Join ASPIRE Academy today and take the first step towards becoming a champion. Our expert coaches are ready to guide you on your path to excellence.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-2 md:pt-4">
                <Button href="#contact">
                  <span>{language === 'ar' ? 'اتصل بنا' : 'Contact Us'}</span>
                  <svg className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Button>
                <Button variant="secondary" to="/about">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                  <span>{language === 'ar' ? 'اعرف المزيد' : 'Learn More'}</span>
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>
    </>
  )
}

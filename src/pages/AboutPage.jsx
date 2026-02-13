import { useLanguage } from '../hooks/useLanguage'
import Badge from '../components/ui/Badge'
import GlassCard from '../components/ui/GlassCard'
import founderImage from '../assets/images/admin-khalid.png'

export default function AboutPage() {
  const { language } = useLanguage()

  const getText = (obj) => obj[language] || obj.en

  const values = [
    { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", title: { en: "Professionalism", ar: "الاحترافية" }, desc: { en: "In work and training", ar: "في العمل والتدريب" } },
    { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", title: { en: "Discipline", ar: "الانضباط" }, desc: { en: "Commitment on and off the field", ar: "والالتزام داخل وخارج الملعب" } },
    { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", title: { en: "Teamwork", ar: "العمل الجماعي" }, desc: { en: "Team spirit", ar: "وروح الفريق" } },
    { icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", title: { en: "Respect", ar: "الاحترام" }, desc: { en: "Mutual respect between players and staff", ar: "المتبادل بين اللاعبين والجهازين" } },
    { icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", title: { en: "Sports Ethics", ar: "الأخلاق الرياضية" }, desc: { en: "And social responsibility", ar: "والمسؤولية المجتمعية" } },
  ]

  const goals = [
    { en: "Discover and refine sports talents across different age groups", ar: "اكتشاف وصقل المواهب الرياضية في مختلف الفئات العمرية" },
    { en: "Prepare players qualified technically, physically, and psychologically", ar: "إعداد لاعبين مؤهلين فنيًا وبدنيًا ونفسيًا" },
    { en: "Instill sports values and positive behavior in players", ar: "غرس القيم الرياضية والسلوك الإيجابي لدى اللاعبين" },
    { en: "Provide a safe and stimulating training environment", ar: "توفير بيئة تدريبية آمنة ومحفزة" },
    { en: "Support players' journey towards professionalism and integration into clubs", ar: "دعم مسيرة اللاعبين نحو الاحتراف والاندماج في الأندية" },
  ]

  const ambitions = [
    { icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", text: { en: "Expansion to more branches within the Kingdom", ar: "التوسع إلى مزيد من الفروع داخل المملكة" } },
    { icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z", text: { en: "Strengthening partnerships with clubs and supporting entities for player development", ar: "تعزيز الشراكات مع الأندية والجهات الداعمة لتطوير اللاعبين" } },
    { icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", text: { en: "Providing advanced programs that keep pace with the latest sports training methods", ar: "تقديم برامج متقدمة تواكب أحدث أساليب التدريب الرياضي" } },
    { icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", text: { en: "Increasing community impact through social responsibility programs", ar: "زيادة التأثير المجتمعي من خلال برامج المسؤولية الاجتماعية" } },
  ]

  const technicalStaff = [
    "كابتن عبده صالح", "كابتن حسن الرديني", "كابتن نوح الاسمري",
    "كابتن فواز حسن", "كابتن محمد الغنام", "كابتن احمد سعيد",
    "كابتن معتز ابراهيم", "كابتن احمد ناصر", "كابتن تركي البيشي",
    "كابتن جاسم الدوسري", "كابتن تركي العبادي", "كابتن يحي غروي",
    "كابتن امين احمد", "كابتن أواب", "كابتن عبداللطيف العبادي"
  ]

  const adminStaff = ["خالد بن عبدالعزيز البو علي", "علي بن محمد صهلولي", "سالم درويش", "رامي الجعدي"]
  const financialStaff = ["خالد قاسم هندي", "هشام ابراهيم"]
  const mediaStaff = ["خالد بن عبدالعزيز البو علي", "محمد بن عبدالوهاب الزين", "عبدالرحمن بن محمد الرشيد", "راكان بن فيصل الوهيب", "عاصم بن ابراهيم الفقي"]

  return (
    <>
      {/* Hero Section */}
      <section className="relative z-10 w-full min-h-[50vh] md:min-h-[60vh] flex items-center justify-center pt-24 md:pt-32 pb-8 md:pb-12 px-4 md:px-6 lg:px-12">
        <div className="max-w-7xl w-full text-center space-y-8">
          <Badge>
            {language === 'ar' ? 'عن أكاديمية أسباير' : 'About ASPIRE Academy'}
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight">
            {language === 'ar' ? 'بناء' : 'Building'} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300 drop-shadow-sm">
              {language === 'ar' ? 'المستقبل' : 'Future'}
            </span> <br />
            {language === 'ar' ? 'أبطال' : 'Champions'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {language === 'ar' 
              ? 'اكتشف قصتنا ورسالتنا والقيم التي تدفعنا نحو التميز في التدريب الرياضي وتطوير الرياضيين.'
              : 'Discover our story, mission, and the values that drive us to excellence in sports training and athlete development.'
            }
          </p>
        </div>
      </section>

      {/* About Academy Section */}
      <section id="about" className="relative z-10 w-full py-12 md:py-24 px-4 md:px-6 lg:px-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <GlassCard hover3d className="p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 order-2 lg:order-1">
                <Badge>{language === 'ar' ? 'من نحن' : 'About Us'}</Badge>
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold leading-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                    {language === 'ar' ? 'أكاديمية أسباير' : 'ASPIRE Academy'}
                  </span>
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed border-l-4 rtl:border-l-0 rtl:border-r-4 border-primary pl-6 rtl:pl-0 rtl:pr-6">
                  {language === 'ar'
                    ? 'أكاديمية أسباير هي أكاديمية رياضية متخصصة في تدريب وتطوير المواهب الناشئة، تهدف إلى إعداد جيل متميز من اللاعبين وفق منهجية احترافية شاملة تجمع بين التدريب الفني والتأهيل البدني وبناء الشخصية، مع التركيز على غرس القيم الرياضية والانضباط والعمل الجماعي، ضمن بيئة تدريبية آمنة ومحفزة تسهم في تطوير قدرات اللاعبين وصقل مهاراتهم داخل الملعب وخارجه.'
                    : 'ASPIRE Academy is a specialized sports academy focused on training and developing emerging talents, aiming to prepare an exceptional generation of players through a comprehensive professional methodology that combines technical training, physical conditioning, and character building, with a focus on instilling sports values, discipline, and teamwork, within a safe and stimulating training environment that contributes to developing players\' capabilities and honing their skills both on and off the field.'
                  }
                </p>
              </div>
              <div className="order-1 lg:order-2 relative h-[400px] lg:h-[500px] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/10 rounded-3xl blur-3xl transform scale-75" />
                <div className="relative z-20 w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/5 dark:to-secondary/20 rounded-3xl flex items-center justify-center animate-float">
                  <div className="text-center space-y-4">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary to-yellow-300 rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 animate-float-delayed">
                      <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                      </svg>
                    </div>
                    <GlassCard className="p-6 backdrop-blur-md">
                      <p className="text-3xl font-black text-primary mb-2">2017</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {language === 'ar' ? 'تأسست' : 'Founded'}
                      </p>
                    </GlassCard>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Founder Section */}
      <section id="founder" className="relative z-10 w-full py-12 md:py-24 px-4 md:px-6 lg:px-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <GlassCard hover3d className="p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-1 lg:order-2 space-y-6">
                <Badge>{language === 'ar' ? 'مؤسس الأكاديمية' : 'Academy Founder'}</Badge>
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold leading-tight">
                  {language === 'ar' ? 'الكابتن' : 'Captain'} <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                    {language === 'ar' ? 'خالد الشهري' : 'Khaled Al-Shehri'}
                  </span>
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed border-l-4 rtl:border-l-0 rtl:border-r-4 border-primary pl-6 rtl:pl-0 rtl:pr-6">
                  {language === 'ar'
                    ? 'انطلقت أكاديمية DH Aspire على يد مؤسسها ومالكها الكابتن خالد الشهري عام 2017، انطلاقًا من رؤية واضحة تؤمن بأن صناعة اللاعب الحقيقي تبدأ من الاهتمام بالموهبة منذ لحظاتها الأولى. جاءت الأكاديمية لتكون بيئة تدريبية متكاملة تُعنى بتطوير اللاعب بدنيًا وفنيًا وسلوكيًا، معتمدة على أسس علمية حديثة وكوادر تدريبية مؤهلة تؤمن برسالة التطوير المستمر.'
                    : 'DH Aspire Academy was launched by its founder and owner, Captain Khaled Al-Shehri, in 2017, based on a clear vision that believes that making a real player starts from caring for talent from its first moments. The academy came to be an integrated training environment that cares about developing the player physically, technically, and behaviorally, relying on modern scientific foundations and qualified training cadres who believe in the mission of continuous development.'
                  }
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <GlassCard className="p-4 flex items-center gap-3 animate-float">
                    <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <p className="font-bold text-sm">{language === 'ar' ? 'المؤسس والمالك' : 'Founder & Owner'}</p>
                  </GlassCard>
                  <GlassCard className="p-4 flex items-center gap-3 animate-float-delayed">
                    <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
                    </svg>
                    <div>
                      <p className="font-bold text-sm">2017</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'ar' ? 'تأسست' : 'Established'}</p>
                    </div>
                  </GlassCard>
                </div>
              </div>
              <div className="order-2 lg:order-1 relative h-[400px] lg:h-[500px] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-bl from-primary/20 to-blue-500/10 rounded-3xl blur-3xl transform scale-75" />
                <div className="relative z-20 w-full h-full bg-gradient-to-bl from-primary/10 to-secondary/10 dark:from-primary/5 dark:to-secondary/20 rounded-3xl flex items-center justify-center animate-float">
                  <div className="text-center space-y-6">
                    <div className="w-40 h-40 mx-auto rounded-full shadow-2xl shadow-primary/40 animate-float-delayed border-4 border-primary/20 overflow-hidden bg-secondary/20">
                      <img src={founderImage} alt="Captain Khaled Al-Shehri" className="w-full h-full object-cover" />
                    </div>
                    <GlassCard className="p-6 backdrop-blur-md">
                      <p className="text-2xl font-black text-primary mb-1">{language === 'ar' ? 'رئيس الأكاديمية' : 'Academy President'}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{language === 'ar' ? 'بناء الأبطال' : 'Building Champions'}</p>
                    </GlassCard>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* History Section */}
      <section id="history" className="relative z-10 w-full py-12 md:py-24 px-4 md:px-6 lg:px-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <GlassCard hover3d className="p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 order-2 lg:order-1">
                <Badge>{language === 'ar' ? 'تاريخ الأكاديمية' : 'Our History'}</Badge>
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold leading-tight">
                  {language === 'ar' ? 'الأكاديمية' : 'Academy'} <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                    {language === 'ar' ? 'التاريخ' : 'History'}
                  </span>
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed border-l-4 rtl:border-l-0 rtl:border-r-4 border-primary pl-6 rtl:pl-0 rtl:pr-6">
                  {language === 'ar'
                    ? 'تأسست أكاديمية أسباير انطلاقًا من إيمانها بأهمية الاستثمار في المواهب الرياضية منذ الصغر، لتكون بيئة تدريبية متكاملة تُعنى بتطوير اللاعبين بدنيًا وفنيًا وسلوكيًا، وفق أسس علمية حديثة وبإشراف كوادر تدريبية مؤهلة.'
                    : 'ASPIRE Academy was founded based on its belief in the importance of investing in sports talents from an early age, to be an integrated training environment that cares about developing players physically, technically, and behaviorally, according to modern scientific foundations and under the supervision of qualified training cadres.'
                  }
                </p>
                <div className="grid grid-cols-3 gap-4 pt-6">
                  <GlassCard className="p-4 text-center animate-float">
                    <p className="text-2xl font-black text-primary">2017</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mt-1">{language === 'ar' ? 'تأسست' : 'Founded'}</p>
                  </GlassCard>
                  <GlassCard className="p-4 text-center animate-float-delayed">
                    <p className="text-2xl font-black text-primary">7+</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mt-1">{language === 'ar' ? 'سنوات' : 'Years'}</p>
                  </GlassCard>
                  <GlassCard className="p-4 text-center animate-float">
                    <p className="text-2xl font-black text-primary">500+</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mt-1">{language === 'ar' ? 'لاعب' : 'Players'}</p>
                  </GlassCard>
                </div>
              </div>
              <div className="order-1 lg:order-2 relative h-[400px] lg:h-[500px] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-blue-500/10 rounded-3xl blur-3xl transform scale-75" />
                <div className="relative z-20 w-full h-full bg-gradient-to-tr from-primary/10 to-secondary/10 dark:from-primary/5 dark:to-secondary/20 rounded-3xl flex items-center justify-center">
                  <div className="absolute w-[120%] h-[120%] border border-primary/10 rounded-full animate-spin-slow pointer-events-none" />
                  <div className="absolute w-[80%] h-[80%] border border-dashed border-primary/20 rounded-full animate-spin-slow pointer-events-none" style={{ animationDirection: 'reverse' }} />
                  <div className="relative z-30 text-center space-y-6 animate-float">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary to-yellow-300 rounded-full flex items-center justify-center shadow-2xl shadow-primary/40">
                      <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                      </svg>
                    </div>
                    <GlassCard className="p-6 backdrop-blur-md">
                      <p className="text-3xl font-black text-primary mb-2">2017</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{language === 'ar' ? 'البداية' : 'The Beginning'}</p>
                    </GlassCard>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Mission & Vision Sections */}
      <section id="mission" className="relative z-10 w-full py-12 md:py-24 px-4 md:px-6 lg:px-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mission */}
          <GlassCard hover3d className="p-8">
            <div className="space-y-6">
              <Badge>{language === 'ar' ? 'الرسالة' : 'Our Mission'}</Badge>
              <h2 className="text-3xl font-extrabold">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                  {language === 'ar' ? 'الرسالة' : 'Mission'}
                </span>
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed border-l-4 rtl:border-l-0 rtl:border-r-4 border-primary pl-6 rtl:pl-0 rtl:pr-6">
                {language === 'ar'
                  ? 'نحن في أكاديمية أسباير نؤمن بأن تطوير اللاعبين الصغار لا يقتصر فقط على المهارات الكروية، بل يشمل بناء الشخصية والانضباط والعمل الجماعي، مما يؤهلهم للنجاح داخل الملعب وخارجه.'
                  : 'At ASPIRE Academy, we believe that developing young players is not limited to football skills alone, but includes building character, discipline, and teamwork, which qualifies them for success both on and off the field.'
                }
              </p>
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-yellow-300 rounded-full flex items-center justify-center mx-auto mt-6">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
                </svg>
              </div>
            </div>
          </GlassCard>

          {/* Vision */}
          <GlassCard hover3d className="p-8">
            <div className="space-y-6">
              <Badge>{language === 'ar' ? 'الرؤية' : 'Our Vision'}</Badge>
              <h2 className="text-3xl font-extrabold">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                  {language === 'ar' ? 'الرؤية' : 'Vision'}
                </span>
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed border-l-4 rtl:border-l-0 rtl:border-r-4 border-primary pl-6 rtl:pl-0 rtl:pr-6">
                {language === 'ar'
                  ? 'أن تكون أكاديمية أسباير الوجهة الأولى لصناعة الأبطال الرياضيين، من خلال تقديم برامج تدريبية احترافية تساهم في تطوير اللاعبين ليصبحوا نجوماً في المستقبل.'
                  : 'To be ASPIRE Academy the premier destination for creating sports champions, by providing professional training programs that contribute to developing players to become stars in the future.'
                }
              </p>
              <div className="w-20 h-20 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center mx-auto mt-6">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Values Section */}
      <section id="values" className="relative z-10 w-full py-12 md:py-24 px-4 md:px-6 lg:px-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <GlassCard hover3d className="p-8 lg:p-12">
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <Badge>{language === 'ar' ? 'القيم' : 'Our Values'}</Badge>
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                    {language === 'ar' ? 'القيم' : 'Values'}
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {values.map((value, idx) => (
                  <GlassCard key={idx} className={`p-6 backdrop-blur-md hover:shadow-lg shadow-primary/10 transition-all duration-500 ${idx % 2 === 0 ? 'animate-float' : 'animate-float-delayed'}`}>
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary to-yellow-300 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={value.icon} />
                        </svg>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 font-bold">{getText(value.title)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{getText(value.desc)}</p>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Goals Section */}
      <section id="goals" className="relative z-10 w-full py-12 md:py-24 px-4 md:px-6 lg:px-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <GlassCard hover3d className="p-8 lg:p-12">
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <Badge>{language === 'ar' ? 'الأهداف' : 'Our Goals'}</Badge>
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                    {language === 'ar' ? 'الأهداف' : 'Goals'}
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.map((goal, idx) => (
                  <GlassCard key={idx} className={`p-6 backdrop-blur-md hover:shadow-lg shadow-primary/10 transition-all duration-500 ${idx === goals.length - 1 ? 'md:col-span-2' : ''} ${idx % 2 === 0 ? 'animate-float' : 'animate-float-delayed'}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-yellow-300 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">{idx + 1}</span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 font-semibold">{getText(goal)}</p>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Ambitions Section */}
      <section id="ambitions" className="relative z-10 w-full py-12 md:py-24 px-4 md:px-6 lg:px-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <GlassCard hover3d className="p-8 lg:p-12">
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <Badge>{language === 'ar' ? 'الطموح' : 'Our Ambitions'}</Badge>
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                    {language === 'ar' ? 'الطموح' : 'Ambitions'}
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ambitions.map((ambition, idx) => (
                  <GlassCard key={idx} className={`p-6 backdrop-blur-md hover:shadow-lg shadow-primary/10 transition-all duration-500 ${idx % 2 === 0 ? 'animate-float' : 'animate-float-delayed'}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-yellow-300 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ambition.icon} />
                        </svg>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 font-semibold">{getText(ambition.text)}</p>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Staff Section */}
      <section id="staff" className="relative z-10 w-full py-12 md:py-24 px-4 md:px-6 lg:px-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <GlassCard hover3d className="p-8 lg:p-12">
            <div className="space-y-12">
              <div className="text-center space-y-4">
                <Badge>{language === 'ar' ? 'الطاقم' : 'Our Team'}</Badge>
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                    {language === 'ar' ? 'الطاقم' : 'Staff'}
                  </span>
                </h2>
              </div>

              {/* Academy President */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-yellow-300 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-secondary dark:text-white">
                    {language === 'ar' ? 'رئيس الأكاديمية' : 'Academy President'}
                  </h3>
                </div>
                <GlassCard className="p-6 backdrop-blur-md">
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center">خالد مهدي الشهري</p>
                </GlassCard>
              </div>

              {/* Administrative Staff */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-yellow-300 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 7h-4V5l-2-2h-4L8 5v2H4c-1.1 0-2 .9-2 2v5c0 .75.4 1.38 1 1.73V19c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2v-3.28c.59-.35 1-.99 1-1.72V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zM4 9h16v5h-5v-3H9v3H4V9zm9 6h-2v-2h2v2zm6 4H5v-3h4v1h6v-1h4v3z"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-secondary dark:text-white">
                    {language === 'ar' ? 'الطاقم الإداري' : 'Administrative Staff'}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {adminStaff.map((name, idx) => (
                    <GlassCard key={idx} className={`p-4 backdrop-blur-md text-center hover:shadow-lg shadow-primary/10 transition-all duration-500 ${idx % 2 === 0 ? 'animate-float' : 'animate-float-delayed'}`}>
                      <p className="text-gray-800 dark:text-gray-200 font-semibold">{name}</p>
                    </GlassCard>
                  ))}
                </div>
              </div>

              {/* Technical Staff */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-yellow-300 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-secondary dark:text-white">
                    {language === 'ar' ? 'الطاقم الفني' : 'Technical Staff'}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {technicalStaff.map((name, idx) => (
                    <GlassCard key={idx} className={`p-4 backdrop-blur-md text-center hover:shadow-lg shadow-primary/10 transition-all duration-500 ${idx % 2 === 0 ? 'animate-float' : 'animate-float-delayed'}`}>
                      <p className="text-gray-800 dark:text-gray-200 font-semibold">{name}</p>
                    </GlassCard>
                  ))}
                </div>
              </div>

              {/* Financial Staff */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-yellow-300 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-secondary dark:text-white">
                    {language === 'ar' ? 'الطاقم المالي' : 'Financial Staff'}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {financialStaff.map((name, idx) => (
                    <GlassCard key={idx} className={`p-4 backdrop-blur-md text-center hover:shadow-lg shadow-primary/10 transition-all duration-500 ${idx % 2 === 0 ? 'animate-float' : 'animate-float-delayed'}`}>
                      <p className="text-gray-800 dark:text-gray-200 font-semibold">{name}</p>
                    </GlassCard>
                  ))}
                </div>
              </div>

              {/* Media Staff */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-yellow-300 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-secondary dark:text-white">
                    {language === 'ar' ? 'الطاقم الإعلامي' : 'Media Staff'}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mediaStaff.map((name, idx) => (
                    <GlassCard key={idx} className={`p-4 backdrop-blur-md text-center hover:shadow-lg shadow-primary/10 transition-all duration-500 ${idx % 2 === 0 ? 'animate-float' : 'animate-float-delayed'}`}>
                      <p className="text-gray-800 dark:text-gray-200 font-semibold">{name}</p>
                    </GlassCard>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>
    </>
  )
}

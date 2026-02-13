import { useEffect, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import GlassCard from '../components/ui/GlassCard'
import sportBottleImg from '../assets/images/Sport_Bottle.jpg'
import jerseyImg from '../assets/images/jerseyjpg.jpg'
import { productsService } from '../services'

export default function StorePage() {
  const { language } = useLanguage()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const fallbackProducts = [
    {
      id: 1,
      name: { en: 'Sport Bottle', ar: 'زجاجة رياضية' },
      description: {
        en: 'Premium quality water bottle with ASPIRE Academy logo',
        ar: 'زجاجة مياه عالية الجودة بشعار أكاديمية أسباير'
      },
      price: 35,
      badge: { en: 'New', ar: 'جديد', color: 'bg-primary' },
      image_url: null
    },
    {
      id: 2,
      name: { en: 'Official Jersey', ar: 'القميص الرسمي' },
      description: {
        en: 'Professional training jersey with academy design',
        ar: 'قميص تدريب احترافي بتصميم الأكاديمية'
      },
      price: 100,
      badge: { en: 'Best Seller', ar: 'الأكثر مبيعاً', color: 'bg-green-500' },
      image_url: null
    }
  ]

  const getText = (obj) => obj[language] || obj.en
  const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

  const resolveProductImage = (product) => {
    if (product.image_url) {
      if (product.image_url.startsWith('http')) return product.image_url
      return `${apiOrigin}${product.image_url}`
    }

    const name = (product?.name?.en || '').toLowerCase()
    if (name.includes('bottle')) return sportBottleImg
    if (name.includes('jersey')) return jerseyImg
    return sportBottleImg
  }

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const response = await productsService.getAll()
        if (response.success && Array.isArray(response.data) && response.data.length > 0) {
          setProducts(response.data)
        } else {
          setProducts(fallbackProducts)
        }
      } catch (error) {
        console.error('Failed to load store products:', error)
        setProducts(fallbackProducts)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <section className="relative z-10 w-full pt-28 md:pt-36 pb-12 md:pb-24 px-4 md:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8 md:space-y-12">
            {/* Simple Header */}
            <div className="text-center space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-300">
                  {language === 'ar' ? 'المتجر' : 'Store'}
                </span>
              </h1>
            </div>

            {/* Product Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {(loading ? fallbackProducts : products).map((product) => (
                <div key={product.id} className="perspective-container">
                  <GlassCard hover3d className="rounded-3xl overflow-hidden">
                    {/* Product Image */}
                    <div className="relative h-80 bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/5 dark:to-secondary/20 flex items-center justify-center p-8 group">
                      <img 
                        src={resolveProductImage(product)}
                        alt={getText(product.name)}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute top-4 right-4">
                        <span className={`px-3 py-1 ${product.badge?.color || 'bg-primary'} text-white text-xs font-bold rounded-full`}>
                          {getText(product.badge || { en: 'New', ar: 'جديد' })}
                        </span>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold text-secondary dark:text-white mb-2">
                          {getText(product.name)}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {getText(product.description)}
                        </p>
                      </div>
                      
                      {/* Price & Add to Cart */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
                        <div>
                          <p className="text-3xl font-black text-primary">
                            {product.price} <span className="text-lg text-gray-600 dark:text-gray-400">{language === 'ar' ? 'ريال' : 'SAR'}</span>
                          </p>
                          {/* <p className="text-xs text-gray-500 dark:text-gray-400">
                            {language === 'ar' ? 'شحن مجاني' : 'Free shipping'}
                          </p> */}
                        </div>
                        <a
                          href={`https://wa.me/966541715198?text=${encodeURIComponent(language === 'ar' ? `أريد طلب: ${getText(product.name)} - ${product.price} ريال` : `I want to order: ${getText(product.name)} - ${product.price} SAR`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-[#25D366] hover:bg-[#1ebe57] text-white rounded-xl font-bold shadow-lg shadow-[#25D366]/30 transform hover:-translate-y-1 transition-all duration-500 flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          <span>{language === 'ar' ? 'اطلب' : 'Order'}</span>
                        </a>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

import { useEffect, useState } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { productsService } from '../../services'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import NumericInput from '../../components/ui/NumericInput'

const getInitialForm = () => ({
  name_en: '',
  name_ar: '',
  description_en: '',
  description_ar: '',
  price: '',
  badge_en: 'New',
  badge_ar: 'جديد',
  badge_color: 'bg-primary'
})

export default function Products() {
  const { language } = useLanguage()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [imageFile, setImageFile] = useState(null)
  const [form, setForm] = useState(getInitialForm())

  const getText = (obj) => obj?.[language] || obj?.en || ''
  const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')
  const resolveImageUrl = (imageUrl) => {
    if (!imageUrl) return null
    if (imageUrl.startsWith('http')) return imageUrl
    return `${apiOrigin}${imageUrl}`
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await productsService.getAdminAll()
      if (response.success) {
        setProducts(response.data || [])
      }
    } catch (error) {
      console.error('Error loading products:', error)
      setMessage({
        type: 'error',
        text: error.message || (language === 'ar' ? 'فشل تحميل المنتجات' : 'Failed to load products')
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm(getInitialForm())
    setImageFile(null)
    setEditingId(null)
    setShowForm(false)
  }

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!message.text) return undefined
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 4000)
    return () => clearTimeout(timer)
  }, [message])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.name_en || !form.name_ar || !form.price) {
      setMessage({
        type: 'error',
        text: language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields'
      })
      return
    }

    setSaving(true)
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => payload.append(key, value))
      if (imageFile) payload.append('image', imageFile)

      const response = editingId
        ? await productsService.update(editingId, payload)
        : await productsService.create(payload)

      if (response.success) {
        setMessage({
          type: 'success',
          text: editingId
            ? (language === 'ar' ? 'تم تحديث المنتج بنجاح' : 'Product updated successfully')
            : (language === 'ar' ? 'تمت إضافة المنتج بنجاح' : 'Product added successfully')
        })
        resetForm()
        await loadProducts()
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || (language === 'ar' ? 'فشل إضافة المنتج' : 'Failed to add product')
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (product) => {
    setEditingId(product.id)
    setShowForm(true)
    setImageFile(null)
    setForm({
      name_en: product.name?.en || '',
      name_ar: product.name?.ar || '',
      description_en: product.description?.en || '',
      description_ar: product.description?.ar || '',
      price: String(product.price || ''),
      badge_en: product.badge?.en || 'New',
      badge_ar: product.badge?.ar || 'جديد',
      badge_color: product.badge?.color || 'bg-primary'
    })
  }

  const handleToggleStatus = async (product) => {
    try {
      setActionLoadingId(product.id)
      const response = await productsService.toggleStatus(product.id)
      if (response.success) {
        setMessage({
          type: 'success',
          text: product.is_active === false
            ? (language === 'ar' ? 'تم تفعيل المنتج' : 'Product activated')
            : (language === 'ar' ? 'تم إلغاء تفعيل المنتج' : 'Product deactivated')
        })
        await loadProducts()
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || (language === 'ar' ? 'فشل تحديث حالة المنتج' : 'Failed to update product status')
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDelete = async (productId) => {
    const confirmed = window.confirm(
      language === 'ar'
        ? 'هل أنت متأكد من حذف هذا المنتج؟'
        : 'Are you sure you want to delete this product?'
    )

    if (!confirmed) return

    try {
      setActionLoadingId(productId)
      const response = await productsService.remove(productId)
      if (response.success) {
        setMessage({
          type: 'success',
          text: language === 'ar' ? 'تم حذف المنتج' : 'Product deleted'
        })
        if (editingId === productId) resetForm()
        await loadProducts()
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || (language === 'ar' ? 'فشل حذف المنتج' : 'Failed to delete product')
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
          {language === 'ar' ? 'إدارة منتجات المتجر' : 'Store Products'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
          {language === 'ar' ? 'إضافة منتجات جديدة للمتجر العام' : 'Add new products to the public store'}
        </p>
      </div>

      <div className="flex items-center justify-end">
        <Button
          onClick={() => {
            if (showForm) {
              resetForm()
              return
            }
            setEditingId(null)
            setForm(getInitialForm())
            setImageFile(null)
            setShowForm(true)
          }}
          className="bg-primary hover:bg-primary/90"
        >
          {showForm
            ? (language === 'ar' ? 'إخفاء النموذج' : 'Hide Form')
            : (language === 'ar' ? 'إضافة منتج' : 'Add Product')}
        </Button>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {showForm && (
        <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
          {editingId
            ? (language === 'ar' ? 'تعديل المنتج' : 'Edit Product')
            : (language === 'ar' ? 'إضافة منتج جديد' : 'Add New Product')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'ar' ? 'الاسم (English) *' : 'Name (English) *'}
              </label>
              <input
                type="text"
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Official Jersey"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'ar' ? 'الاسم (عربي) *' : 'Name (Arabic) *'}
              </label>
              <input
                type="text"
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="القميص الرسمي"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'ar' ? 'الوصف (English)' : 'Description (English)'}
              </label>
              <textarea
                value={form.description_en}
                onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Professional training jersey with academy design"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
              </label>
              <textarea
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="قميص تدريب احترافي بتصميم الأكاديمية"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'ar' ? 'السعر (ريال) *' : 'Price (SAR) *'}
              </label>
              <NumericInput
                min="1"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="250"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'ar' ? 'صورة المنتج' : 'Product Image'}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-800 dark:text-white file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'ar' ? 'شارة المنتج (English)' : 'Badge (English)'}
              </label>
              <input
                type="text"
                value={form.badge_en}
                onChange={(e) => setForm({ ...form, badge_en: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Best Seller"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'ar' ? 'شارة المنتج (عربي)' : 'Badge (Arabic)'}
              </label>
              <input
                type="text"
                value={form.badge_ar}
                onChange={(e) => setForm({ ...form, badge_ar: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="الأكثر مبيعاً"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                  : editingId
                    ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                    : (language === 'ar' ? 'إضافة المنتج' : 'Add Product')}
              </Button>
              <Button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"
              >
                {editingId
                  ? (language === 'ar' ? 'إلغاء التعديل' : 'Cancel Edit')
                  : (language === 'ar' ? 'إلغاء' : 'Cancel')}
              </Button>
            </div>
          </div>
        </form>
        </GlassCard>
      )}

      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-secondary dark:text-white mb-4">
          {language === 'ar' ? 'المنتجات الحالية' : 'Current Products'}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="w-10 h-10 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'ar' ? 'لا توجد منتجات حتى الآن' : 'No products yet'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((product) => (
              <div key={product.id} className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white/40 dark:bg-white/5 space-y-3">
                {resolveImageUrl(product.image_url) && (
                  <img
                    src={resolveImageUrl(product.image_url)}
                    alt={getText(product.name)}
                    className="w-full h-36 object-cover rounded-lg border border-gray-200 dark:border-white/10"
                  />
                )}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-secondary dark:text-white">{getText(product.name)}</h3>
                  <span className="text-sm font-bold text-primary">{product.price} SAR</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {getText(product.description) || (language === 'ar' ? 'بدون وصف' : 'No description')}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      product.is_active === false
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                  >
                    {product.is_active === false
                      ? (language === 'ar' ? 'غير نشط' : 'Inactive')
                      : (language === 'ar' ? 'نشط' : 'Active')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      disabled={actionLoadingId === product.id}
                    >
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleToggleStatus(product)}
                      className="text-xs text-amber-600 hover:text-amber-800 font-semibold"
                      disabled={actionLoadingId === product.id}
                    >
                      {product.is_active === false
                        ? (language === 'ar' ? 'تفعيل' : 'Activate')
                        : (language === 'ar' ? 'إلغاء التفعيل' : 'Deactivate')}
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold"
                      disabled={actionLoadingId === product.id}
                    >
                      {language === 'ar' ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}

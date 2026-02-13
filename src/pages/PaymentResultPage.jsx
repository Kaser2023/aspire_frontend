import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'
import { paymentsService } from '../services'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'

export default function PaymentResultPage() {
  const { language } = useLanguage()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [paymentDetails, setPaymentDetails] = useState(null)
  const [error, setError] = useState(null)

  const status = searchParams.get('status')
  const paymentId = searchParams.get('payment_id')
  const errorMessage = searchParams.get('message')

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentId) {
        setPaymentStatus(status || 'error')
        setError(errorMessage || (language === 'ar' ? 'معرف الدفع غير موجود' : 'Payment ID not found'))
        setLoading(false)
        return
      }

      try {
        // Verify payment status with backend
        const response = await paymentsService.verifyGatewayPayment(paymentId)
        
        if (response.success) {
          setPaymentDetails(response.data)
          setPaymentStatus(response.data.local_status || response.data.gateway_status || status)
        } else {
          setPaymentStatus(status || 'error')
          setError(response.message)
        }
      } catch (err) {
        console.error('Error verifying payment:', err)
        setPaymentStatus(status || 'error')
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    verifyPayment()
  }, [paymentId, status, errorMessage, language])

  const getStatusConfig = () => {
    switch (paymentStatus) {
      case 'success':
      case 'completed':
        return {
          icon: (
            <svg className="w-20 h-20 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: language === 'ar' ? 'تم الدفع بنجاح!' : 'Payment Successful!',
          message: language === 'ar' 
            ? 'تم استلام دفعتك وتفعيل الاشتراك. شكراً لك!'
            : 'Your payment has been received and subscription activated. Thank you!',
          color: 'emerald',
          bgGradient: 'from-emerald-500/20 to-green-500/20'
        }
      case 'pending':
        return {
          icon: (
            <svg className="w-20 h-20 text-yellow-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: language === 'ar' ? 'الدفع قيد المعالجة' : 'Payment Processing',
          message: language === 'ar'
            ? 'جاري معالجة دفعتك. سيتم تحديث حالة الاشتراك قريباً.'
            : 'Your payment is being processed. Subscription status will be updated shortly.',
          color: 'yellow',
          bgGradient: 'from-yellow-500/20 to-orange-500/20'
        }
      case 'failed':
        return {
          icon: (
            <svg className="w-20 h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: language === 'ar' ? 'فشل الدفع' : 'Payment Failed',
          message: language === 'ar'
            ? 'لم نتمكن من معالجة دفعتك. يرجى المحاولة مرة أخرى.'
            : 'We could not process your payment. Please try again.',
          color: 'red',
          bgGradient: 'from-red-500/20 to-pink-500/20'
        }
      default:
        return {
          icon: (
            <svg className="w-20 h-20 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: language === 'ar' ? 'خطأ' : 'Error',
          message: error || errorMessage || (language === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'),
          color: 'gray',
          bgGradient: 'from-gray-500/20 to-slate-500/20'
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <svg className="w-16 h-16 text-primary animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'جاري التحقق من حالة الدفع...' : 'Verifying payment status...'}
          </p>
        </div>
      </div>
    )
  }

  const config = getStatusConfig()

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${config.bgGradient} dark:from-gray-900 dark:to-gray-800 p-4`}>
      <GlassCard className="max-w-md w-full p-8 text-center">
        {/* Status Icon */}
        <div className="flex justify-center mb-6">
          {config.icon}
        </div>

        {/* Title */}
        <h1 className={`text-2xl font-bold mb-4 text-${config.color}-600 dark:text-${config.color}-400`}>
          {config.title}
        </h1>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {config.message}
        </p>

        {/* Payment Details */}
        {paymentDetails && (paymentStatus === 'success' || paymentStatus === 'completed') && (
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {language === 'ar' ? 'تفاصيل الدفع' : 'Payment Details'}
            </h3>
            <div className="space-y-2 text-sm">
              {paymentDetails.amount && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'ar' ? 'المبلغ:' : 'Amount:'}</span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    SAR {paymentDetails.amount}
                  </span>
                </div>
              )}
              {paymentDetails.source?.type && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'ar' ? 'طريقة الدفع:' : 'Payment Method:'}</span>
                  <span className="font-medium text-gray-800 dark:text-white capitalize">
                    {paymentDetails.source.type}
                  </span>
                </div>
              )}
              {paymentDetails.source?.lastFour && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'ar' ? 'البطاقة:' : 'Card:'}</span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    **** {paymentDetails.source.lastFour}
                  </span>
                </div>
              )}
              {paymentDetails.payment_id && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'ar' ? 'رقم المرجع:' : 'Reference:'}</span>
                  <span className="font-medium text-gray-800 dark:text-white text-xs">
                    #{paymentDetails.payment_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {(paymentStatus === 'success' || paymentStatus === 'completed') && (
            <Button
              onClick={() => navigate('/dashboard/payments')}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {language === 'ar' ? 'عرض المدفوعات' : 'View Payments'}
            </Button>
          )}
          
          {paymentStatus === 'failed' && (
            <Button
              onClick={() => navigate('/dashboard/programs')}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {language === 'ar' ? 'المحاولة مرة أخرى' : 'Try Again'}
            </Button>
          )}

          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"
          >
            {language === 'ar' ? 'العودة للرئيسية' : 'Back to Dashboard'}
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}

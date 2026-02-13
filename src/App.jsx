import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import PublicRoute from './components/auth/PublicRoute'
import DashboardLayout from './components/dashboard/DashboardLayout'
import CoachDashboardLayout from './components/coach/CoachDashboardLayout'
import HomePage from './pages/HomePage'
import StorePage from './pages/StorePage'
import AboutPage from './pages/AboutPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AdminSignupPage from './pages/AdminSignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import PaymentResultPage from './pages/PaymentResultPage'
import {
  DashboardHome,
  MyChildren,
  DashboardPrograms,
  Schedule,
  Attendance,
  Performance,
  Payments,
  Notifications,
  Settings
} from './pages/dashboard'
import {
  CoachDashboardHome,
  MyPlayers,
  CoachAttendance,
  Evaluations,
  CoachReports,
  CoachSchedule,
  CoachNotifications,
  CoachSettings
} from './pages/coach'
import BranchAdminDashboardLayout from './components/branchAdmin/BranchAdminDashboardLayout'
import {
  BranchAdminHome,
  Coaches,
  Players,
  Schedule as BranchAdminSchedule,
  Attendance as BranchAdminAttendance,
  Reports as BranchAdminReports,
  Announcements,
  Notifications as BranchAdminNotifications,
  Settings as BranchAdminSettings
} from './pages/branchAdmin'
import AccountantDashboardLayout from './components/accountant/AccountantDashboardLayout'
import {
  AccountantHome,
  Subscriptions,
  Payments as AccountantPayments,
  Reports as AccountantReports,
  Branches,
  Expenses,
  Staff,
  Attendance as AccountantAttendance,
  Notifications as AccountantNotifications,
  Settings as AccountantSettings,
  Discounts as AccountantDiscounts
} from './pages/accountant'
import SuperAdminDashboardLayout from './components/superAdmin/SuperAdminDashboardLayout'
import {
  SuperAdminHome,
  Users,
  Branches as SuperAdminBranches,
  Programs as SuperAdminPrograms,
  Financial,
  Attendance as SuperAdminAttendance,
  Reports as SuperAdminReports,
  Announcements as SuperAdminAnnouncements,
  SMS as SuperAdminSMS,
  Notifications as SuperAdminNotifications,
  Settings as SuperAdminSettings,
  Discounts as SuperAdminDiscounts,
  SubscriptionFreezes as SuperAdminSubscriptionFreezes,
  Products as SuperAdminProducts
} from './pages/superAdmin'

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes with Main Layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="programs" element={<Navigate to="/" replace />} />
              <Route path="store" element={<StorePage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="login" element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } />
              <Route path="signup" element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              } />
              <Route path="admin-signup" element={
                <PublicRoute>
                  <AdminSignupPage />
                </PublicRoute>
              } />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="payment/result" element={<PaymentResultPage />} />
              <Route path="payment/callback" element={<PaymentResultPage />} />
            </Route>

            {/* Parent Dashboard Routes - Protected */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['parent']}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardHome />} />
              <Route path="children" element={<MyChildren />} />
              <Route path="programs" element={<DashboardPrograms />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="performance" element={<Performance />} />
              <Route path="payments" element={<Payments />} />
              <Route path="store" element={<StorePage />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Coach Dashboard Routes - Protected */}
            <Route path="/coach" element={
              <ProtectedRoute allowedRoles={['coach']}>
                <CoachDashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<CoachDashboardHome />} />
              <Route path="players" element={<MyPlayers />} />
              <Route path="attendance" element={<CoachAttendance />} />
              <Route path="evaluations" element={<Evaluations />} />
              <Route path="reports" element={<CoachReports />} />
              <Route path="schedule" element={<CoachSchedule />} />
              <Route path="notifications" element={<CoachNotifications />} />
              <Route path="settings" element={<CoachSettings />} />
            </Route>

            {/* Branch Admin Dashboard Routes - Protected */}
            <Route path="/branch-admin" element={
              <ProtectedRoute allowedRoles={['branch_admin']}>
                <BranchAdminDashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<BranchAdminHome />} />
              <Route path="coaches" element={<Coaches />} />
              <Route path="players" element={<Players />} />
              <Route path="programs" element={<SuperAdminPrograms />} />
              <Route path="discounts" element={<SuperAdminDiscounts />} />
              <Route path="subscription-freezes" element={<SuperAdminSubscriptionFreezes />} />
              <Route path="sms" element={<SuperAdminSMS />} />
              <Route path="schedule" element={<BranchAdminSchedule />} />
              <Route path="attendance" element={<BranchAdminAttendance />} />
              <Route path="reports" element={<BranchAdminReports />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="notifications" element={<BranchAdminNotifications />} />
              <Route path="settings" element={<BranchAdminSettings />} />
            </Route>

            {/* Accountant Dashboard Routes - Protected */}
            <Route path="/accountant" element={
              <ProtectedRoute allowedRoles={['accountant']}>
                <AccountantDashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AccountantHome />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="payments" element={<AccountantPayments />} />
              <Route path="reports" element={<AccountantReports />} />
              <Route path="branches" element={<Branches />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="staff" element={<Staff />} />
              <Route path="attendance" element={<AccountantAttendance />} />
              <Route path="notifications" element={<AccountantNotifications />} />
              <Route path="discounts" element={<AccountantDiscounts />} />
              <Route path="settings" element={<AccountantSettings />} />
            </Route>

            {/* Super Admin Dashboard Routes - Protected */}
            <Route path="/super-admin" element={
              <ProtectedRoute allowedRoles={['super_admin', 'owner']}>
                <SuperAdminDashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<SuperAdminHome />} />
              <Route path="users" element={<Users />} />
              <Route path="branches" element={<SuperAdminBranches />} />
              <Route path="programs" element={<SuperAdminPrograms />} />
              <Route path="financial" element={<Financial />} />
              <Route path="attendance" element={<SuperAdminAttendance />} />
              <Route path="reports" element={<SuperAdminReports />} />
              <Route path="announcements" element={<SuperAdminAnnouncements />} />
              <Route path="sms" element={<SuperAdminSMS />} />
              <Route path="notifications" element={<SuperAdminNotifications />} />
              <Route path="discounts" element={<SuperAdminDiscounts />} />
              <Route path="subscription-freezes" element={<SuperAdminSubscriptionFreezes />} />
              <Route path="products" element={<SuperAdminProducts />} />
              <Route path="settings" element={<SuperAdminSettings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App

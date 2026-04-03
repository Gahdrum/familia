
import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import ScrollToTop from '@/components/ScrollToTop.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import SignupPage from '@/pages/SignupPage.jsx';
import DashboardPage from '@/pages/DashboardPage.jsx';
import JointWalletPage from '@/pages/JointWalletPage.jsx';
import IndividualWalletPage from '@/pages/IndividualWalletPage.jsx';
import SplitCalculatorPage from '@/pages/SplitCalculatorPage.jsx';
import BusinessPage from '@/pages/BusinessPage.jsx';
import GoalsPage from '@/pages/GoalsPage.jsx';
import FinancialCalendarPage from '@/pages/FinancialCalendarPage.jsx';
import IntegrationsPage from '@/pages/IntegrationsPage.jsx';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/carteira-conjunta" element={<ProtectedRoute><JointWalletPage /></ProtectedRoute>} />
            <Route path="/carteira-individual" element={<ProtectedRoute><IndividualWalletPage /></ProtectedRoute>} />
            <Route path="/rateio" element={<ProtectedRoute><SplitCalculatorPage /></ProtectedRoute>} />
            <Route path="/pf-pj" element={<ProtectedRoute><BusinessPage /></ProtectedRoute>} />
            <Route path="/metas" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
            <Route path="/calendario" element={<ProtectedRoute><FinancialCalendarPage /></ProtectedRoute>} />
            <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
          </Routes>
          <Toaster position="top-right" richColors />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

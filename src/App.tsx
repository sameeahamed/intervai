/**
 * Main Application Root & Router
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/common/Navbar.tsx';
import { Footer } from './components/common/Footer.tsx';
import { PrivacyConsentModal } from './components/common/PrivacyConsentModal.tsx';
import { DatabaseStatusModal } from './components/common/DatabaseStatusModal.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { LandingPage } from './components/candidate/LandingPage.tsx';
import { CandidateDashboard } from './components/candidate/CandidateDashboard.tsx';
import { InterviewSetup } from './components/candidate/InterviewSetup.tsx';
import { InterviewRoom } from './components/candidate/InterviewRoom.tsx';
import { AssessmentReport } from './components/candidate/AssessmentReport.tsx';
import { InterviewHistory } from './components/candidate/InterviewHistory.tsx';
import { CandidateProfile } from './components/candidate/CandidateProfile.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';

function AppContent() {
  const { isAuthenticated, isAdmin } = useAuth();

  // Navigation State
  // Guests start on the landing page; authenticated users land on the dashboard.
  const [currentView, setCurrentView] = useState<string>('landing');
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // When a valid stored session resolves after page load, restore the
  // pre-authentication dashboard view for returning users.
  useEffect(() => {
    if (isAuthenticated && currentView === 'landing') {
      setCurrentView('dashboard');
    }
  }, [isAuthenticated]);

  // Modals
  const [privacyModalOpen, setPrivacyModalOpen] = useState<boolean>(false);
  const [databaseModalOpen, setDatabaseModalOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  const handleStartSetup = () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    setCurrentView('setup');
  };

  const handleInterviewCreated = (interviewId: string) => {
    setActiveInterviewId(interviewId);
    setCurrentView('room');
  };

  const handleInterviewFinished = (interviewId: string) => {
    setSelectedReportId(interviewId);
    setCurrentView('report');
  };

  const handleViewReport = (interviewId: string) => {
    setSelectedReportId(interviewId);
    setCurrentView('report');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0b] text-[#e5e7eb] selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'setup') handleStartSetup();
          else setCurrentView(view);
        }}
        onOpenPrivacyModal={() => setPrivacyModalOpen(true)}
        onOpenDatabaseModal={() => setDatabaseModalOpen(true)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 flex flex-col">
        {currentView === 'landing' && (
          <LandingPage
            onStartInterview={handleStartSetup}
            onOpenPrivacy={() => setPrivacyModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentView === 'dashboard' && (
          <CandidateDashboard
            onStartSetup={handleStartSetup}
            onViewReport={handleViewReport}
            onViewHistory={() => setCurrentView('history')}
          />
        )}

        {currentView === 'setup' && (
          <InterviewSetup
            onInterviewCreated={handleInterviewCreated}
            onCancel={() => setCurrentView('dashboard')}
            onOpenPrivacy={() => setPrivacyModalOpen(true)}
          />
        )}

        {currentView === 'room' && activeInterviewId && (
          <InterviewRoom
            interviewId={activeInterviewId}
            onInterviewFinished={handleInterviewFinished}
            onExit={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'report' && selectedReportId && (
          <AssessmentReport
            interviewId={selectedReportId}
            onBackToDashboard={() => setCurrentView('dashboard')}
            onStartNew={handleStartSetup}
          />
        )}

        {currentView === 'history' && (
          <InterviewHistory
            onViewReport={handleViewReport}
            onStartNew={handleStartSetup}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'profile' && (
          <CandidateProfile onBack={() => setCurrentView('dashboard')} />
        )}

        {currentView === 'admin' && (
          <AdminDashboard onViewCandidateReport={handleViewReport} />
        )}
      </main>

      {/* Footer */}
      <Footer onOpenPrivacy={() => setPrivacyModalOpen(true)} />

      {/* Global Modals */}
      <PrivacyConsentModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
      />

      <DatabaseStatusModal
        isOpen={databaseModalOpen}
        onClose={() => setDatabaseModalOpen(false)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setCurrentView('dashboard')}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

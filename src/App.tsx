import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LogOut, ShieldCheck, X } from 'lucide-react';
import { api, type BootstrapPayload, type RequestAuthContext } from './api';
import { AdminConsoleView } from './components/AdminConsoleView';
import { CounselorDeskView } from './components/CounselorDeskView';
import { PersonaAvatar } from './components/RiskIndicator';
import { StudentDossierDrawer } from './components/StudentDossierDrawer';
import { StudentPortalView } from './components/StudentPortalView';
import { useAuth } from './context/AuthContext';
import type { CounselorAlert, InterventionLog, UserRole } from './types';

type ActiveSection =
  | 'overview'
  | 'students'
  | 'alerts'
  | 'counseling'
  | 'admin';

export default function App() {
  const {
    firebaseUser,
    loadingAuth,
    authError,
    signInWithGoogle,
    signOutUser,
    getToken,
  } = useAuth();

  const [previewRole, setPreviewRole] = useState<UserRole | undefined>(undefined);
  const [previewStudentId, setPreviewStudentId] = useState<string | undefined>(
    undefined
  );

  const authCtx: RequestAuthContext = useMemo(
    () => ({
      getToken,
      previewRole,
      previewStudentId,
    }),
    [getToken, previewRole, previewStudentId]
  );

  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [section, setSection] = useState<ActiveSection>('overview');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadWorkspace = useCallback(async () => {
    if (!firebaseUser) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const bootRes = await api.bootstrap(authCtx);
      setData(bootRes);
      if (bootRes.user.role === 'student') {
        setSelectedStudentId(null);
        setSection('overview');
      } else if (bootRes.user.role === 'counselor' && section === 'admin') {
        setSection('overview');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load workspace data.'
      );
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, authCtx, section]);

  useEffect(() => {
    loadWorkspace();
  }, [firebaseUser, authCtx]);

  const handleSelectPreview = (role?: UserRole, studentId?: string) => {
    setSelectedStudentId(null);
    setSection('overview');
    setPreviewRole(role);
    setPreviewStudentId(studentId);
  };

  const handleDataMutated = (message: string) => {
    showToast(message);
    loadWorkspace();
  };

  const handleAlertsUpdated = (alerts: CounselorAlert[], message: string) => {
    showToast(message);
    setData((prev) =>
      prev
        ? {
            ...prev,
            alerts,
            analytics: prev.analytics
              ? {
                  ...prev.analytics,
                  unread_alerts_count: alerts.filter(
                    (a) => a.status === 'Unread'
                  ).length,
                }
              : prev.analytics,
          }
        : prev
    );
  };

  const handleStudentInterventionsUpdated = (logs: InterventionLog[]) => {
    setData((prev) => (prev ? { ...prev, interventions: logs } : prev));
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-sm text-[#5C645E]">
        Checking authentication session...
      </div>
    );
  }

  // Google Sign-In Gate when unauthenticated
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#1F2421] flex flex-col justify-between px-6 py-10">
        <header className="max-w-[1100px] w-full mx-auto flex items-center justify-between">
          <span className="font-display text-2xl font-semibold tracking-tight text-[#1F2421]">
            Beacon
          </span>
          <span className="text-xs text-[#5C645E]">
            Student Retention & Counselling
          </span>
        </header>

        <main className="max-w-lg w-full mx-auto bg-[#FFFFFF] border border-[#E5DFD5] rounded-lg p-8 space-y-6 my-12">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4D7C5F]">
              <ShieldCheck className="w-4 h-4" />
              Protected Academic Advising Portal
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1F2421] text-balance">
              Early-Warning Student Support & Counselling
            </h1>
            <p className="text-sm text-[#5C645E] leading-relaxed">
              Sign in with your Google account to access role-scoped cohort analytics, automated counselor alerts, or your personal student support mentor.
            </p>
          </div>

          <div className="border-t border-b border-[#E5DFD5] py-4 space-y-2.5 text-xs text-[#5C645E]">
            <div>
              <strong className="font-medium text-[#1F2421]">Admin & Faculty:</strong>{' '}
              Bulk CSV ingestion, risk threshold tuning, and RBAC account control.
            </div>
            <div>
              <strong className="font-medium text-[#1F2421]">Counselor & Advisors:</strong>{' '}
              Live at-risk queues, explainable factor dossiers, and session logging.
            </div>
            <div>
              <strong className="font-medium text-[#1F2421]">Students:</strong>{' '}
              Personal standing overview and empathetic Gemini AI counseling chat.
            </div>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B91C1C]">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full py-3 px-4 rounded-lg bg-[#1F2421] text-white text-sm font-medium hover:bg-[#343B37] transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
              />
            </svg>
            Sign in with Google
          </button>
        </main>

        <footer className="max-w-[1100px] w-full mx-auto text-center text-xs text-[#5C645E]">
          Beacon Early-Warning & Student Counselling System
        </footer>
      </div>
    );
  }

  const activeUser = data?.user;
  const unreadCount = data?.analytics?.unread_alerts_count ?? 0;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1F2421] flex flex-col">
      {/* 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E5DFD5]">
        <div className="max-w-[1380px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setSection('overview')}
            className="font-display text-xl font-semibold tracking-tight text-[#1F2421] whitespace-nowrap shrink-0 text-left cursor-pointer"
          >
            Beacon
          </button>

          <nav
            aria-label="Primary workspace navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {activeUser?.role === 'student' ? (
              <>
                <a
                  href="#student-portal"
                  className="text-[#1F2421] border-b-2 border-[#C2593F] py-5 whitespace-nowrap shrink-0"
                >
                  Academic Standing
                </a>
                <a
                  href="#student-portal"
                  className="text-[#5C645E] hover:text-[#1F2421] py-5 whitespace-nowrap shrink-0 transition-colors"
                >
                  AI Support Mentor
                </a>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSection('overview')}
                  className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    section === 'overview'
                      ? 'border-[#C2593F] text-[#1F2421]'
                      : 'border-transparent text-[#5C645E] hover:text-[#1F2421]'
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setSection('students')}
                  className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    section === 'students'
                      ? 'border-[#C2593F] text-[#1F2421]'
                      : 'border-transparent text-[#5C645E] hover:text-[#1F2421]'
                  }`}
                >
                  Students
                </button>
                <button
                  type="button"
                  onClick={() => setSection('alerts')}
                  className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    section === 'alerts'
                      ? 'border-[#C2593F] text-[#1F2421]'
                      : 'border-transparent text-[#5C645E] hover:text-[#1F2421]'
                  }`}
                >
                  Alerts{unreadCount > 0 ? ` (${unreadCount})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setSection('counseling')}
                  className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    section === 'counseling'
                      ? 'border-[#C2593F] text-[#1F2421]'
                      : 'border-transparent text-[#5C645E] hover:text-[#1F2421]'
                  }`}
                >
                  Counseling Logs
                </button>
                {activeUser?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setSection('admin')}
                    className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                      section === 'admin'
                        ? 'border-[#C2593F] text-[#1F2421]'
                        : 'border-transparent text-[#5C645E] hover:text-[#1F2421]'
                    }`}
                  >
                    Ingestion & Rules
                  </button>
                )}
              </>
            )}
          </nav>

          <div className="shrink-0">
            {activeUser?.role === 'admin' ? (
              <button
                type="button"
                onClick={() => setSection('admin')}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[#C2593F] text-white hover:bg-[#A64630] transition-colors whitespace-nowrap shrink-0"
              >
                Import Metrics
              </button>
            ) : activeUser?.role === 'counselor' ? (
              <button
                type="button"
                onClick={() => setSection('alerts')}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[#C2593F] text-white hover:bg-[#A64630] transition-colors whitespace-nowrap shrink-0"
              >
                Review Alerts
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>(
                    '#student-portal input[type="text"]'
                  );
                  input?.focus();
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[#4D7C5F] text-white hover:bg-[#3B624A] transition-colors whitespace-nowrap shrink-0"
              >
                Message Mentor
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Authenticated Account & Admin Role-Preview Toolbar */}
      <div className="bg-[#F3EFEA] border-b border-[#E5DFD5]">
        <div className="max-w-[1380px] mx-auto px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PersonaAvatar
              src={activeUser?.avatar_url || firebaseUser.photoURL}
              name={activeUser?.name || firebaseUser.displayName || 'User'}
              size="md"
            />
            <div>
              <div className="text-sm font-semibold text-[#1F2421]">
                {activeUser?.name || firebaseUser.displayName || firebaseUser.email}
              </div>
              <div className="text-xs text-[#5C645E]">
                <span className="capitalize font-medium text-[#1F2421]">
                  {activeUser?.role || 'Loading...'}
                </span>
                <span aria-hidden="true"> · </span>
                <span>{firebaseUser.email}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data?.baseRole === 'admin' && (
              <div className="flex flex-wrap items-center gap-1.5 mr-2">
                <span className="text-xs text-[#5C645E] mr-1">
                  Preview Portal:
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectPreview(undefined, undefined)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    !previewRole || previewRole === 'admin'
                      ? 'bg-[#1F2421] text-white'
                      : 'bg-[#FFFFFF] border border-[#E5DFD5] text-[#5C645E] hover:text-[#1F2421]'
                  }`}
                >
                  Admin View
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreview('counselor', undefined)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    previewRole === 'counselor'
                      ? 'bg-[#1F2421] text-white'
                      : 'bg-[#FFFFFF] border border-[#E5DFD5] text-[#5C645E] hover:text-[#1F2421]'
                  }`}
                >
                  Counselor View
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreview('student', 'STU-1042')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    previewRole === 'student' && previewStudentId === 'STU-1042'
                      ? 'bg-[#1F2421] text-white'
                      : 'bg-[#FFFFFF] border border-[#E5DFD5] text-[#5C645E] hover:text-[#1F2421]'
                  }`}
                >
                  Student: Maya Lin
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreview('student', 'STU-1087')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    previewRole === 'student' && previewStudentId === 'STU-1087'
                      ? 'bg-[#1F2421] text-white'
                      : 'bg-[#FFFFFF] border border-[#E5DFD5] text-[#5C645E] hover:text-[#1F2421]'
                  }`}
                >
                  Student: Jordan Alvarez
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={signOutUser}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E5DFD5] bg-[#FFFFFF] text-xs font-medium text-[#5C645E] hover:text-[#1F2421] transition-colors whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      {activeUser && activeUser.role !== 'student' && (
        <div className="md:hidden bg-[#FFFFFF] border-b border-[#E5DFD5] px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {(
            [
              ['overview', 'Overview'],
              ['students', 'Students'],
              ['alerts', `Alerts${unreadCount > 0 ? ` (${unreadCount})` : ''}`],
              ['counseling', 'Counseling'],
              ...(activeUser.role === 'admin'
                ? ([['admin', 'Ingestion & Rules']] as const)
                : []),
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
                section === key
                  ? 'bg-[#1F2421] text-white'
                  : 'text-[#5C645E] hover:text-[#1F2421]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Toast Confirmation */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 max-w-md bg-[#1F2421] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-xs"
        >
          <CheckCircle2 className="w-4 h-4 text-[#84C59C] shrink-0" />
          <span className="leading-relaxed">{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/70 hover:text-white ml-1"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-8">
        <div className="mb-7">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1F2421] text-balance">
            {activeUser?.role === 'student'
              ? 'Student Success & Support Portal'
              : section === 'admin'
                ? 'Data Ingestion, Risk Rules & Access Control'
                : section === 'alerts'
                  ? 'Automated Alert Queue & Triage'
                  : section === 'students'
                    ? 'Cohort Risk & Engagement Directory'
                    : section === 'counseling'
                      ? 'Counseling Sessions & Intervention Logs'
                      : 'Student Retention & Early-Warning Overview'}
          </h1>
          <p className="mt-1 text-sm text-[#5C645E]">
            {activeUser?.role === 'student'
              ? 'Review your live academic trajectory and connect with Beacon AI Mentor for supportive guidance.'
              : 'Explainable dropout risk intelligence paired with timely faculty alerts and compassionate student outreach.'}
          </p>
        </div>

        {loading && !data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 rounded-lg bg-[#FFFFFF] border border-[#E5DFD5] p-5 animate-pulse"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="p-5 rounded-lg bg-[#FDF2F2] border border-[#F5C6C6] flex items-center justify-between gap-4 mb-6">
            <div className="text-sm text-[#B91C1C]">{error}</div>
            <button
              type="button"
              onClick={loadWorkspace}
              className="px-3.5 py-1.5 rounded-lg bg-[#B91C1C] text-white text-xs font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {data && activeUser && (
          <>
            {activeUser.role === 'student' ? (
              data.myStudent ? (
                <div id="student-portal">
                  <StudentPortalView
                    authCtx={authCtx}
                    activeUser={activeUser}
                    student={data.myStudent}
                    initialInterventions={data.interventions ?? []}
                    onInterventionsUpdated={handleStudentInterventionsUpdated}
                  />
                </div>
              ) : (
                <div className="bg-[#FFFFFF] border border-[#E5DFD5] rounded-lg p-8 text-center text-sm text-[#5C645E]">
                  No student academic profile is linked to this account yet.
                </div>
              )
            ) : section === 'admin' && activeUser.role === 'admin' ? (
              <AdminConsoleView
                authCtx={authCtx}
                currentUserId={activeUser.id}
                config={data.config}
                users={data.users ?? []}
                onRefreshNeeded={handleDataMutated}
              />
            ) : (
              data.analytics && (
                <CounselorDeskView
                  authCtx={authCtx}
                  section={section === 'admin' ? 'overview' : section}
                  students={data.students ?? []}
                  alerts={data.alerts ?? []}
                  analytics={data.analytics}
                  interventions={data.interventions ?? []}
                  config={data.config}
                  onSelectStudent={(sid) => setSelectedStudentId(sid)}
                  onAlertsUpdated={handleAlertsUpdated}
                />
              )
            )}
          </>
        )}
      </main>

      <footer className="border-t border-[#E5DFD5] bg-[#FFFFFF]">
        <div className="max-w-[1380px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5C645E]">
          <span>Beacon Early-Warning & Student Counselling System</span>
          <span className="font-mono tabular-nums">
            Active High-Risk Threshold: {data?.config.high_risk_threshold.toFixed(2) ?? '0.70'}
          </span>
        </div>
      </footer>

      {activeUser && activeUser.role !== 'student' && (
        <StudentDossierDrawer
          studentId={selectedStudentId}
          authCtx={authCtx}
          activeRole={activeUser.role}
          onClose={() => setSelectedStudentId(null)}
          onDataMutated={handleDataMutated}
        />
      )}
    </div>
  );
}

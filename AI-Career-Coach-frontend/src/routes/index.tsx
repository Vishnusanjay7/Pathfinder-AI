import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import VerifyRegistrationPage from '../pages/auth/VerifyRegistrationPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ResumeUploadPage from '../pages/resume/ResumeUploadPage';
import ResumeHistoryPage from '../pages/resume/ResumeHistoryPage';
import AssessmentPage from '../pages/assessment/AssessmentPage';
import CodingPage from '../pages/coding/CodingPage';
import CodingHistoryPage from '../pages/coding/CodingHistoryPage';
import JobsPage from '../pages/jobs/JobsPage';
import CompanyPreparationPage from '../pages/jobs/CompanyPreparationPage';
import MyApplicationsPage from '../pages/jobs/MyApplicationsPage';
import ProfilePage from '../pages/profile/ProfilePage';
import SettingsPage from '../pages/settings/SettingsPage';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import LearningCenterPage from '../pages/learning/LearningCenterPage';
import MockInterviewPage from '../pages/mock-interview/MockInterviewPage';
import InterviewRoomPage from '../pages/mock-interview/InterviewRoomPage';
import InterviewReportPage from '../pages/mock-interview/InterviewReportPage';
import InterviewHistoryPage from '../pages/mock-interview/InterviewHistoryPage';
import NotFoundPage from '../pages/NotFoundPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/register/verify',
    element: <VerifyRegistrationPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      // Fullscreen isolated Mock Interview Room
      {
        path: 'mock-interview/room/:id',
        element: <InterviewRoomPage />,
      },
      // Redirect legacy v2 room to main room
      {
        path: 'mock-interview-v2/room/:id',
        element: <InterviewRoomPage />,
      },
      // Standard Dashboard layout pages
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'resume', element: <ResumeUploadPage /> },
          { path: 'resume/upload', element: <ResumeUploadPage /> },
          { path: 'resume/history', element: <ResumeHistoryPage /> },
          { path: 'assessment', element: <AssessmentPage /> },
          { path: 'coding', element: <CodingPage /> },
          { path: 'coding/history', element: <CodingHistoryPage /> },
          { path: 'jobs', element: <JobsPage /> },
          { path: 'jobs/match', element: <JobsPage /> },
          { path: 'jobs/recommend', element: <JobsPage /> },
          { path: 'jobs/company-prep/:prepId', element: <CompanyPreparationPage /> },
          { path: 'applications', element: <MyApplicationsPage /> },
          { path: 'my-applications', element: <MyApplicationsPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'learning', element: <LearningCenterPage /> },
          { path: 'mock-interview', element: <MockInterviewPage /> },
          { path: 'mock-interview/report/:id', element: <InterviewReportPage /> },
          { path: 'mock-interview/history', element: <InterviewHistoryPage /> },
          // Seamless redirects for legacy v2 routes to unified mock interview
          { path: 'mock-interview-v2', element: <Navigate to="/mock-interview" replace /> },
          { path: 'mock-interview-v2/report/:id', element: <InterviewReportPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;

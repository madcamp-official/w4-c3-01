import { HashRouter, Route, Routes } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import ProtectedLayout from '@/components/ProtectedLayout';
import PublicOnlyLayout from '@/components/PublicOnlyLayout';
import { AppStateProvider } from '@/state/AppStateContext';
import { OverlayProvider } from '@/state/OverlayContext';
import { PlacementProvider } from '@/state/PlacementContext';
import { ToastProvider } from '@/state/ToastContext';

import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import OnboardingPage from '@/pages/OnboardingPage';
import FeedPage from '@/pages/FeedPage';
import SearchPage from '@/pages/SearchPage';
import CameraPage from '@/pages/CameraPage';
import PreviewPage from '@/pages/PreviewPage';
import ChatListPage from '@/pages/ChatListPage';
import ChatThreadPage from '@/pages/ChatThreadPage';
import AirwritePage from '@/pages/AirwritePage';
import MyPage from '@/pages/MyPage';
import EditHeartPage from '@/pages/EditHeartPage';
import LoungeListPage from '@/pages/LoungeListPage';
import LoungeViewPage from '@/pages/LoungeViewPage';

export default function App() {
  return (
    <ToastProvider>
      <AppStateProvider>
        <OverlayProvider>
          <PlacementProvider>
            <HashRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route element={<PublicOnlyLayout />}>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<OnboardingPage />} />
                  </Route>

                  <Route element={<ProtectedLayout />}>
                    <Route path="/feed" element={<FeedPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/camera" element={<CameraPage />} />
                    <Route path="/preview" element={<PreviewPage />} />
                    <Route path="/chats" element={<ChatListPage />} />
                    <Route path="/chats/:chatId" element={<ChatThreadPage />} />
                    <Route path="/chats/:chatId/airwrite" element={<AirwritePage />} />
                    <Route path="/mypage" element={<MyPage />} />
                    <Route path="/mypage/heart" element={<EditHeartPage />} />
                    <Route path="/lounges" element={<LoungeListPage />} />
                    <Route path="/lounges/:loungeId" element={<LoungeViewPage />} />
                  </Route>
                </Route>
              </Routes>
            </HashRouter>
          </PlacementProvider>
        </OverlayProvider>
      </AppStateProvider>
    </ToastProvider>
  );
}

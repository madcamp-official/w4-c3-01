import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import type { AppStackParamList, AuthStackParamList } from '@/navigation/types';

type LinkingParamList = AppStackParamList &
  AuthStackParamList & {
    CompleteProfile: undefined;
  };

export const linking: LinkingOptions<LinkingParamList> = {
  prefixes: [Linking.createURL('/'), 'aline://'],
  config: {
    screens: {
      // OAuth 콜백(aline://auth-callback)은 Supabase JS가 URL의 ?code=를 직접 처리하지
      // 않으므로(lib/oauth.ts가 WebBrowser 결과 URL에서 직접 파싱합니다) 여기 등록할 화면은
      // 없지만, prefix가 이 scheme을 인식하고는 있어야 딥링크 자체가 앱으로 돌아옵니다.
      Landing: 'auth',
      Login: 'auth/login',
      Onboarding: 'auth/onboarding',
      CompleteProfile: 'complete-profile',
      MainTabs: 'app',
      Camera: 'app/camera'
    }
  }
};

// Ported from frontend/src/pages/LoginPage.tsx — keep in sync.
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';
import { colors } from '@/theme/colors';
import { common } from '@/theme/common';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { loginUser, loginWithGoogle } = useAppState();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!identifier.trim() || !password) {
      showToast('아이디와 비밀번호를 입력해주세요');
      return;
    }
    setSubmitting(true);
    try {
      await loginUser({ identifier: identifier.trim(), password });
      showToast('손끝에 오신 걸 환영해요 🎉');
      // RootNavigator가 session 값을 보고 자동으로 App 스택으로 전환합니다.
    } catch (err) {
      showToast(err instanceof Error ? err.message : '로그인에 실패했어요');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    try {
      await loginWithGoogle();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Google 로그인을 시작하지 못했어요');
    }
  }

  return (
    <SafeAreaView style={common.screen} edges={['top', 'bottom']}>
      <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
        <Feather name="chevron-left" size={24} color={colors.ink} />
      </Pressable>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
        <Text style={common.title}>다시 만나서 반가워요</Text>
        <Text style={common.subtitle}>아이디 또는 이메일과 비밀번호를 입력해주세요</Text>

        <View style={common.field}>
          <Text style={common.label}>아이디 또는 이메일</Text>
          <TextInput
            style={common.input}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={common.field}>
          <Text style={common.label}>비밀번호</Text>
          <TextInput
            style={common.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            onSubmitEditing={handleSubmit}
          />
        </View>

        <View style={{ flex: 1 }} />

        <Pressable
          style={[common.btn, common.btnPrimary, submitting && common.btnDisabled]}
          disabled={submitting}
          onPress={handleSubmit}
        >
          <Text style={common.btnPrimaryText}>로그인</Text>
        </Pressable>

        <View style={common.dividerRow}>
          <View style={common.dividerLine} />
          <Text style={common.dividerText}>또는</Text>
          <View style={common.dividerLine} />
        </View>

        <Pressable style={[common.btn, common.btnGhost]} onPress={handleGoogle}>
          <Text style={common.btnGhostText}>Google로 계속하기</Text>
        </Pressable>

        <Pressable style={common.linkBtn} onPress={() => navigation.navigate('Onboarding')}>
          <Text style={common.linkBtnText}>계정이 없으신가요? 회원가입</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

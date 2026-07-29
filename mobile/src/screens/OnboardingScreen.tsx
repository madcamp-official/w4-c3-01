// Adapted from frontend/src/pages/OnboardingPage.tsx — keep in sync.
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AirDrawingWebView, { type AirDrawingCapture } from '@/components/AirDrawingWebView';
import AvatarPicker from '@/components/AvatarPicker';
import SketchyButton from '@/components/SketchyButton';
import SketchyInput from '@/components/SketchyInput';
import { useUsernameCheck, usernameStatusMessage } from '@/hooks/useUsernameCheck';
import { AVATAR_TONES, defaultHeartUrl } from '@/mock/store';
import type { AuthStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius, type ThemeColors } from '@/theme/colors';
import { buildCommon } from '@/theme/common';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/;

function passwordHint(password: string, colors: ThemeColors): { text: string; color: string } | null {
  if (!password) return null;
  if (PASSWORD_RULE.test(password)) return { text: '사용할 수 있는 비밀번호예요', color: colors.inkSoft };
  return { text: '8~12자, 영문·숫자·특수문자를 모두 포함해주세요', color: colors.danger };
}

export default function OnboardingScreen({ navigation }: Props) {
  const { signupUser, loginWithGoogle } = useAppState();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({ username: '', email: '', nickname: '', password: '', password2: '' });
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [heartPreview, setHeartPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const usernameStatus = useUsernameCheck(form.username);
  const usernameHint = usernameStatusMessage(usernameStatus, colors);
  const pwHint = passwordHint(form.password, colors);
  const passwordValid = PASSWORD_RULE.test(form.password);

  const step1Filled = Object.values(form).every((v) => v.trim().length > 0);
  const canGoNext = step1Filled && usernameStatus === 'available' && passwordValid;

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleNext() {
    if (form.password !== form.password2) {
      showToast('비밀번호가 일치하지 않아요');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      showToast('이메일 형식을 확인해주세요');
      return;
    }
    setStep(2);
  }

  async function finishOnboarding(heartUrl: string) {
    setSubmitting(true);
    try {
      await signupUser({
        username: form.username.trim(),
        email: form.email.trim(),
        nickname: form.nickname.trim(),
        password: form.password,
        heartUrl,
        avatarUrl: avatarDataUrl
      });
      showToast(`ALine에 오신 걸 환영해요, ${form.nickname.trim()}님 🎉`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '회원가입에 실패했어요');
      setSubmitting(false);
    }
  }

  function handleHeartCapture(capture: AirDrawingCapture) {
    setHeartPreview(capture.image);
  }

  function handleSkipHeart() {
    void finishOnboarding(defaultHeartUrl());
  }

  async function handleGoogle() {
    try {
      await loginWithGoogle();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Google 로그인을 시작하지 못했어요');
    }
  }

  function handleBack() {
    if (step === 1) navigation.goBack();
    else setStep((s) => (s - 1) as 1 | 2);
  }

  if (step === 3 && heartPreview) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ink }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 220, height: 220, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.paper2 }}>
            <Image source={{ uri: heartPreview }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
        </View>
        <View style={{ padding: 20, gap: 10 }}>
          <SketchyButton variant="primary" blobVariant="a" disabled={submitting} onPress={() => finishOnboarding(heartPreview)}>
            <Text style={common.btnPrimaryText}>{submitting ? '가입하는 중...' : '이 하트로 가입 완료'}</Text>
          </SketchyButton>
          <SketchyButton variant="ghost" blobVariant="b" disabled={submitting} onPress={() => setHeartPreview(null)}>
            <Text style={common.btnGhostText}>다시 그리기</Text>
          </SketchyButton>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 3) {
    return (
      <AirDrawingWebView
        mode="heart"
        outputSize={220}
        onClose={() => setStep(2)}
        onCapture={handleHeartCapture}
        onError={(message) => showToast(message)}
      />
    );
  }

  return (
    <SafeAreaView style={common.screen} edges={['top', 'bottom']}>
      <Pressable style={{ width: 36, height: 36, justifyContent: 'center', marginBottom: step === 1 ? 8 : 0 }} onPress={handleBack}>
        <Icon name="chevron-left" size={24} color={colors.ink} />
      </Pressable>

      {step === 1 ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
          <Text style={common.title}>반가워요 👋</Text>
          <Text style={common.subtitle}>ALine에서 활동할 계정을 만들어주세요</Text>

          <View style={common.field}>
            <Text style={common.label}>아이디</Text>
            <SketchyInput
              blobVariant="a"
              placeholder="영문, 숫자 조합"
              value={form.username}
              onChangeText={(v) => updateField('username', v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {usernameHint ? <Text style={[common.hint, { color: usernameHint.color }]}>{usernameHint.text}</Text> : null}
          </View>
          <View style={common.field}>
            <Text style={common.label}>이메일</Text>
            <SketchyInput
              blobVariant="b"
              placeholder="example@email.com"
              value={form.email}
              onChangeText={(v) => updateField('email', v)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>
          <View style={common.field}>
            <Text style={common.label}>이름</Text>
            <SketchyInput blobVariant="a" maxLength={16} value={form.nickname} onChangeText={(v) => updateField('nickname', v)} />
          </View>
          <View style={common.field}>
            <Text style={common.label}>비밀번호</Text>
            <SketchyInput
              blobVariant="b"
              placeholder="8~12자, 영문·숫자·특수문자 포함"
              value={form.password}
              onChangeText={(v) => updateField('password', v)}
              secureTextEntry
            />
            {pwHint ? <Text style={[common.hint, { color: pwHint.color }]}>{pwHint.text}</Text> : null}
          </View>
          <View style={common.field}>
            <Text style={common.label}>비밀번호 확인</Text>
            <SketchyInput blobVariant="a" value={form.password2} onChangeText={(v) => updateField('password2', v)} secureTextEntry />
          </View>

          <SketchyButton variant="primary" blobVariant="a" disabled={!canGoNext} onPress={handleNext}>
            <Text style={common.btnPrimaryText}>다음</Text>
          </SketchyButton>

          <View style={common.dividerRow}>
            <View style={common.dividerLine} />
            <Text style={common.dividerText}>또는</Text>
            <View style={common.dividerLine} />
          </View>

          <SketchyButton variant="ghost" blobVariant="b" onPress={handleGoogle}>
            <Text style={common.btnGhostText}>Google로 계속하기</Text>
          </SketchyButton>

          <Pressable style={common.linkBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={common.linkBtnText}>이미 계정이 있으신가요? 로그인</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', paddingTop: 12 }}>
          <Text style={common.title}>프로필 사진을 넣어볼까요?</Text>
          <Text style={[common.subtitle, { textAlign: 'center' }]}>나중에 마이페이지에서 언제든 바꿀 수 있어요{'\n'}건너뛰어도 괜찮아요</Text>
          <View style={{ marginVertical: 20 }}>
            <AvatarPicker dataUrl={avatarDataUrl} nickname={form.nickname || '?'} color={AVATAR_TONES[0]} size={120} onChange={setAvatarDataUrl} />
          </View>
          <View style={{ flex: 1 }} />
          <SketchyButton variant="primary" style={{ width: '100%' }} onPress={() => setStep(3)}>
            <Text style={common.btnPrimaryText}>다음</Text>
          </SketchyButton>
          <Pressable style={common.linkBtn} disabled={submitting} onPress={handleSkipHeart}>
            <Text style={common.linkBtnText}>{submitting ? '가입하는 중...' : '기본 하트로 시작할게요'}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

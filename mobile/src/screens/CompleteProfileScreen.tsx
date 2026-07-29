// Adapted from frontend/src/pages/CompleteProfilePage.tsx — keep in sync.
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AirDrawingWebView, { type AirDrawingCapture } from '@/components/AirDrawingWebView';
import AvatarPicker from '@/components/AvatarPicker';
import SketchyButton from '@/components/SketchyButton';
import SketchyInput from '@/components/SketchyInput';
import { useUsernameCheck, usernameStatusMessage, type UsernameStatus } from '@/hooks/useUsernameCheck';
import { defaultHeartUrl } from '@/mock/store';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius } from '@/theme/colors';
import { buildCommon } from '@/theme/common';

/** Google 등 OAuth로 처음 로그인한 사람이 아이디를 확인하고 프로필을 완성하는 필수 1회 화면. */
export default function CompleteProfileScreen() {
  const { session, setAvatar, setHeart, updateProfile } = useAppState();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [dataUrl, setDataUrl] = useState<string | null>(session?.avatarUrl ?? null);
  const [username, setUsername] = useState(session?.username ?? '');
  const [nickname, setNickname] = useState(session?.nickname ?? '');
  const [heartPreview, setHeartPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const usernameChanged = username.trim() !== session?.username;
  const liveStatus = useUsernameCheck(usernameChanged ? username : '', session?.id);
  const usernameStatus: UsernameStatus = usernameChanged ? liveStatus : 'available';
  const usernameHint = usernameChanged ? usernameStatusMessage(usernameStatus, colors) : null;

  if (!session) return null;

  function handleNext() {
    if (usernameStatus !== 'available') {
      showToast('아이디를 확인해주세요');
      return;
    }
    if (!nickname.trim()) {
      showToast('이름을 입력해주세요');
      return;
    }
    // 이미 하트가 있는 계정(예전에 그려둔 적 있는 경우)은 다시 그리라고 하지 않고 바로 완료합니다.
    if (session!.heartUrl) {
      void finish(session!.heartUrl);
      return;
    }
    setStep(2);
  }

  async function finish(heartUrl: string) {
    setSaving(true);
    try {
      if (dataUrl && dataUrl !== session!.avatarUrl) await setAvatar(dataUrl);
      if (heartUrl !== session!.heartUrl) await setHeart(heartUrl);
      await updateProfile({ username: username.trim(), nickname: nickname.trim(), onboarded: true });
      showToast(`ALine에 오신 걸 환영해요, ${nickname.trim()}님 🎉`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장하지 못했어요');
      setSaving(false);
    }
  }

  function handleHeartCapture(capture: AirDrawingCapture) {
    setHeartPreview(capture.image);
  }

  function handleSkipHeart() {
    void finish(defaultHeartUrl());
  }

  if (step === 2 && heartPreview) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ink }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 220, height: 220, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.paper2 }}>
            <Image source={{ uri: heartPreview }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
        </View>
        <View style={{ padding: 20, gap: 10 }}>
          <SketchyButton variant="primary" blobVariant="a" disabled={saving} onPress={() => finish(heartPreview)}>
            <Text style={common.btnPrimaryText}>{saving ? '저장하는 중...' : '이 하트로 완료'}</Text>
          </SketchyButton>
          <SketchyButton variant="ghost" blobVariant="b" disabled={saving} onPress={() => setHeartPreview(null)}>
            <Text style={common.btnGhostText}>다시 그리기</Text>
          </SketchyButton>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 2) {
    return (
      <AirDrawingWebView
        mode="heart"
        outputSize={220}
        onClose={() => setStep(1)}
        onCapture={handleHeartCapture}
        onError={(message) => showToast(message)}
      />
    );
  }

  return (
    <SafeAreaView style={common.screen} edges={['top', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}>
        <Text style={common.title}>거의 다 됐어요 👋</Text>
        <Text style={common.subtitle}>Google 계정으로 로그인하셨네요. 아이디를 자동으로 만들어뒀어요{'\n'}마음에 안 들면 지금 바꿔주세요</Text>

        <View style={{ alignItems: 'center', marginVertical: 12 }}>
          <AvatarPicker dataUrl={dataUrl} nickname={session.nickname} color={session.avatarColor} size={100} onChange={setDataUrl} />
        </View>

        <View style={common.field}>
          <Text style={common.label}>아이디</Text>
          <SketchyInput blobVariant="a" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
          {usernameHint ? <Text style={[common.hint, { color: usernameHint.color }]}>{usernameHint.text}</Text> : null}
        </View>
        <View style={common.field}>
          <Text style={common.label}>이름</Text>
          <SketchyInput blobVariant="b" maxLength={16} value={nickname} onChangeText={setNickname} />
        </View>

        <SketchyButton variant="primary" blobVariant="a" disabled={saving} onPress={handleNext}>
          <Text style={common.btnPrimaryText}>{saving ? '저장하는 중...' : '다음'}</Text>
        </SketchyButton>
        {!session.heartUrl ? (
          <Pressable style={common.linkBtn} disabled={saving} onPress={handleSkipHeart}>
            <Text style={common.linkBtnText}>기본 하트로 시작할게요</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

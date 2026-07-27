// Adapted from frontend/src/pages/CompleteProfilePage.tsx — keep in sync.
// The heart-redraw step is stubbed to the default heart until Phase 4 wires
// up the air-drawing WebView bridge (same scope note as OnboardingScreen).
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarPicker from '@/components/AvatarPicker';
import { useUsernameCheck, usernameStatusMessage, type UsernameStatus } from '@/hooks/useUsernameCheck';
import { defaultHeartUrl } from '@/mock/store';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';
import { common } from '@/theme/common';

/** Google 등 OAuth로 처음 로그인한 사람이 아이디를 확인하고 프로필을 완성하는 필수 1회 화면. */
export default function CompleteProfileScreen() {
  const { session, setAvatar, setHeart, updateProfile } = useAppState();
  const { showToast } = useToast();

  const [dataUrl, setDataUrl] = useState<string | null>(session?.avatarUrl ?? null);
  const [username, setUsername] = useState(session?.username ?? '');
  const [nickname, setNickname] = useState(session?.nickname ?? '');
  const [saving, setSaving] = useState(false);

  const usernameChanged = username.trim() !== session?.username;
  const liveStatus = useUsernameCheck(usernameChanged ? username : '', session?.id);
  const usernameStatus: UsernameStatus = usernameChanged ? liveStatus : 'available';
  const usernameHint = usernameChanged ? usernameStatusMessage(usernameStatus) : null;

  if (!session) return null;

  async function handleDone() {
    if (usernameStatus !== 'available') {
      showToast('아이디를 확인해주세요');
      return;
    }
    if (!nickname.trim()) {
      showToast('이름을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      if (dataUrl && dataUrl !== session!.avatarUrl) await setAvatar(dataUrl);
      if (!session!.heartUrl) await setHeart(defaultHeartUrl());
      await updateProfile({ username: username.trim(), nickname: nickname.trim(), onboarded: true });
      showToast(`손끝에 오신 걸 환영해요, ${nickname.trim()}님 🎉`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장하지 못했어요');
    } finally {
      setSaving(false);
    }
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
          <TextInput style={common.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
          {usernameHint ? <Text style={[common.hint, { color: usernameHint.color }]}>{usernameHint.text}</Text> : null}
        </View>
        <View style={common.field}>
          <Text style={common.label}>이름</Text>
          <TextInput style={common.input} maxLength={16} value={nickname} onChangeText={setNickname} />
        </View>

        <Pressable style={[common.btn, common.btnPrimary, saving && common.btnDisabled]} disabled={saving} onPress={handleDone}>
          <Text style={common.btnPrimaryText}>{saving ? '저장하는 중...' : '완료'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// Ported from frontend/src/pages/EditProfilePage.tsx — keep in sync.
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AvatarPicker from '@/components/AvatarPicker';
import SketchyButton from '@/components/SketchyButton';
import SketchyInput from '@/components/SketchyInput';
import { useUsernameCheck, usernameStatusMessage, type UsernameStatus } from '@/hooks/useUsernameCheck';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';
import { colors } from '@/theme/colors';
import { common } from '@/theme/common';

type Props = NativeStackScreenProps<AppStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const { session, setAvatar, updateProfile } = useAppState();
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

  async function handleSave() {
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
      await updateProfile({ username: username.trim(), nickname: nickname.trim() });
      showToast('프로필을 저장했어요');
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장하지 못했어요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={common.screen} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
        <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>프로필 수정</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
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
        <SketchyButton variant="primary" disabled={saving} onPress={handleSave}>
          <Text style={common.btnPrimaryText}>저장</Text>
        </SketchyButton>
      </ScrollView>
    </SafeAreaView>
  );
}

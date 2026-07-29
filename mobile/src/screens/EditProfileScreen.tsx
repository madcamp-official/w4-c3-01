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
import { useBottomInset } from '@/lib/useBottomInset';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius } from '@/theme/colors';
import { buildCommon } from '@/theme/common';

type Props = NativeStackScreenProps<AppStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const { session, setAvatar, updateProfile } = useAppState();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const bottomInset = useBottomInset();
  const { showToast } = useToast();

  const [dataUrl, setDataUrl] = useState<string | null>(session?.avatarUrl ?? null);
  const [username, setUsername] = useState(session?.username ?? '');
  const [nickname, setNickname] = useState(session?.nickname ?? '');
  const [bio, setBio] = useState(session?.bio ?? '');
  const [saving, setSaving] = useState(false);

  const usernameChanged = username.trim() !== session?.username;
  const liveStatus = useUsernameCheck(usernameChanged ? username : '', session?.id);
  const usernameStatus: UsernameStatus = usernameChanged ? liveStatus : 'available';
  const usernameHint = usernameChanged ? usernameStatusMessage(usernameStatus, colors) : null;

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
      await updateProfile({ username: username.trim(), nickname: nickname.trim(), bio: bio.trim() });
      showToast('프로필을 저장했어요');
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장하지 못했어요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
        <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>프로필 수정</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 24 + bottomInset }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
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
        <View style={[common.field, { marginBottom: 32 }]}>
          <Text style={common.label}>자기소개</Text>
          <SketchyInput
            shape="round"
            radius={radius.md}
            maxLength={160}
            multiline
            numberOfLines={3}
            placeholder="나를 소개하는 짧은 글을 적어보세요"
            style={{ minHeight: 92 }}
            textAlignVertical="top"
            value={bio}
            onChangeText={setBio}
          />
          <Text style={[common.hint, { textAlign: 'right' }]}>{bio.length}/160</Text>
        </View>
        <SketchyButton variant="primary" disabled={saving} onPress={handleSave}>
          <Text style={common.btnPrimaryText}>저장</Text>
        </SketchyButton>
      </ScrollView>
    </SafeAreaView>
  );
}

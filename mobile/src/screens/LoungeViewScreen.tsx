// Placeholder for Phase 5 — real camera-backdrop placement comes then.
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { useTheme } from '@/state/ThemeContext';
import { buildCommon } from '@/theme/common';

type Props = NativeStackScreenProps<AppStackParamList, 'LoungeView'>;

export default function LoungeViewScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const common = buildCommon(colors);
  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
        <Icon name="chevron-left" size={24} color={colors.ink} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={common.title}>라운지</Text>
        <Text style={common.subtitle}>Phase 5에서 구현됩니다.</Text>
      </View>
    </SafeAreaView>
  );
}

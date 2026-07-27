// Placeholder for Phase 4 — real air-drawing heart redraw comes then.
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { common } from '@/theme/common';

type Props = NativeStackScreenProps<AppStackParamList, 'EditHeart'>;

export default function EditHeartScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={common.screen} edges={['top', 'bottom']}>
      <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
        <Feather name="chevron-left" size={24} color={colors.ink} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={common.title}>하트 다시 그리기</Text>
        <Text style={common.subtitle}>Phase 4에서 구현됩니다.</Text>
      </View>
    </SafeAreaView>
  );
}

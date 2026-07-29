// Ported from frontend/src/pages/LandingPage.tsx — keep in sync.
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import SketchyButton from '@/components/SketchyButton';
import type { AuthStackParamList } from '@/navigation/types';
import { useTheme } from '@/state/ThemeContext';
import { buildCommon } from '@/theme/common';

type Props = NativeStackScreenProps<AuthStackParamList, 'Landing'>;

export default function LandingScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const styles = makeStyles(colors);
  return (
    <SafeAreaView style={common.screen} edges={['top', 'bottom']}>
      <View style={styles.spacer} />
      <View style={{ alignItems: 'center', paddingHorizontal: 6 }}>
        <View style={styles.logoRow}>
          <View style={styles.dot} />
          <Text style={styles.logo}>ALine</Text>
        </View>
        <Text style={styles.sub}>손으로 그리고, 허공에 쓰는{'\n'}당신만의 SNS</Text>
      </View>
      <View style={{ gap: 12 }}>
        <SketchyButton variant="primary" blobVariant="a" onPress={() => navigation.navigate('Login')}>
          <Text style={common.btnPrimaryText}>로그인</Text>
        </SketchyButton>
        <SketchyButton variant="ghost" blobVariant="b" onPress={() => navigation.navigate('Onboarding')}>
          <Text style={common.btnGhostText}>회원가입</Text>
        </SketchyButton>
      </View>
      <View style={styles.spacer} />
    </SafeAreaView>
  );
}

function makeStyles(colors: import('@/theme/colors').ThemeColors) {
  return StyleSheet.create({
    spacer: { flex: 1 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger },
    logo: { fontSize: 34, fontWeight: '800', color: colors.ink },
    sub: { fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 21, marginBottom: 34 }
  });
}

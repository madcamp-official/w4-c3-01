import { StyleSheet } from 'react-native';
import { colors as defaultColors, radius, type ThemeColors } from '@/theme/colors';

/** Builds the shared screen/form styles against a given color set — call with
 * useTheme().colors so styles follow the light/dark toggle. `common` below
 * (built against the static light palette) still exists for anything not yet
 * wired to useTheme(). */
export function buildCommon(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.paper,
      paddingHorizontal: 20
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.ink,
      marginTop: 8,
      marginBottom: 4
    },
    subtitle: {
      fontSize: 13,
      color: colors.inkSoft,
      lineHeight: 19,
      marginBottom: 20
    },
    field: {
      marginBottom: 14
    },
    label: {
      fontSize: 12,
      color: colors.inkSoft,
      marginBottom: 6
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.paper,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.ink
    },
    hint: {
      fontSize: 11,
      marginTop: 6
    },
    btn: {
      borderRadius: radius.pill,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center'
    },
    btnPrimary: {
      backgroundColor: colors.accent
    },
    btnPrimaryText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700'
    },
    btnGhost: {
      borderWidth: 1.4,
      borderColor: colors.border,
      backgroundColor: colors.paper
    },
    btnGhostText: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: '600'
    },
    btnDisabled: {
      opacity: 0.5
    },
    linkBtn: {
      alignSelf: 'center',
      marginTop: 14,
      padding: 6
    },
    linkBtnText: {
      color: colors.inkSoft,
      fontSize: 13,
      textDecorationLine: 'underline'
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: 18
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border
    },
    dividerText: {
      fontSize: 11,
      color: colors.inkSoft
    }
  });
}

/** Static (light-only) instance — kept so files not yet migrated to useTheme() keep working. */
export const common = buildCommon(defaultColors);

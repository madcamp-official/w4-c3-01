// Ported from frontend/src/components/PostMenu.tsx — keep in sync. Shared
// "more" menu for a post's own author: a dropdown anchored under the kebab
// icon with "수정하기"/"삭제하기" items (a divider between them when both are
// shown). Edit hands off to the caller (the feed's list navigates to the
// same Preview screen used before posting, with the button relabeled);
// delete opens a confirm modal styled like LoungeListScreen's own
// delete-confirm modal (same layout/spacing, but using theme tokens since
// this lives in the themed part of the app rather than the Lounge's own
// hardcoded dark palette). Renders nothing for posts that aren't the
// viewer's own.
import { useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View, type StyleProp, type View as RNView, type ViewStyle } from 'react-native';
import Icon from '@/components/Icon';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import type { Post } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PostMenu({
  post,
  iconColor,
  iconSize = 20,
  triggerStyle,
  /** Only the feed's scrolling list offers editing — the permalink screen
   * (reached from chat-shared posts, notifications, etc.) keeps just delete. */
  onEdit,
  onDeleted
}: {
  post: Post;
  iconColor?: string;
  iconSize?: number;
  triggerStyle?: StyleProp<ViewStyle>;
  onEdit?: () => void;
  /** Called after the post is actually deleted — e.g. PostDetailScreen uses
   * this to navigate back, since the permalink it's showing no longer exists. */
  onDeleted?: () => void;
}) {
  const { deletePost } = useAppState();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const anchorRef = useRef<RNView>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!post.mine) return null;

  function openMenu() {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPos({ top: y + height + 4, right: Math.max(8, SCREEN_WIDTH - (x + width)) });
    });
  }

  async function handleConfirmDelete() {
    setConfirmOpen(false);
    await deletePost(post.id);
    onDeleted?.();
  }

  return (
    <>
      <Pressable ref={anchorRef} style={[styles.iconBtn, triggerStyle]} onPress={openMenu}>
        <Icon name="more-vertical" size={iconSize} color={iconColor ?? colors.ink} />
      </Pressable>

      <Modal visible={!!menuPos} transparent animationType="fade" onRequestClose={() => setMenuPos(null)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuPos(null)}>
          {menuPos ? (
            <View style={[styles.dropdown, { top: menuPos.top, right: menuPos.right }]}>
              {onEdit ? (
                <>
                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => {
                      setMenuPos(null);
                      onEdit();
                    }}
                  >
                    <Text style={styles.dropdownItemTextInk}>수정하기</Text>
                  </Pressable>
                  <View style={styles.dropdownDivider} />
                </>
              ) : null}
              <Pressable
                style={styles.dropdownItem}
                onPress={() => {
                  setMenuPos(null);
                  setConfirmOpen(true);
                }}
              >
                <Text style={styles.dropdownItemText}>삭제하기</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Modal>

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Icon name="trash-2" size={22} color={colors.danger} />
            </View>
            <Text style={styles.confirmTitle}>이 게시물을 삭제할까요?</Text>
            <Text style={styles.confirmDescription}>삭제한 게시물은 되돌릴 수 없어요.</Text>
            <View style={styles.confirmActions}>
              <Pressable style={[styles.confirmBtn, styles.cancelBtn]} onPress={() => setConfirmOpen(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, styles.deleteBtn]} onPress={handleConfirmDelete}>
                <Text style={styles.deleteText}>삭제하기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(colors: import('@/theme/colors').ThemeColors) {
  return StyleSheet.create({
    iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    dropdown: {
      position: 'absolute',
      minWidth: 120,
      borderRadius: 14,
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
      overflow: 'hidden'
    },
    dropdownItem: { paddingVertical: 12, paddingHorizontal: 16 },
    dropdownItemText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
    dropdownItemTextInk: { color: colors.ink, fontSize: 14, fontWeight: '700' },
    dropdownDivider: { height: 1, backgroundColor: colors.border },
    backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(8,9,12,0.66)' },
    confirmCard: {
      width: '100%',
      maxWidth: 350,
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 18,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.paper,
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 14 },
      elevation: 16
    },
    confirmIcon: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      borderRadius: 24,
      backgroundColor: 'rgba(178,59,46,0.12)'
    },
    confirmTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
    confirmDescription: { marginTop: 9, color: colors.inkSoft, fontSize: 12, fontWeight: '600', lineHeight: 19, textAlign: 'center' },
    confirmActions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 22 },
    confirmBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
    cancelBtn: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper2 },
    deleteBtn: { backgroundColor: colors.ink },
    cancelText: { color: colors.inkSoft, fontSize: 13, fontWeight: '800' },
    deleteText: { color: colors.paper, fontSize: 13, fontWeight: '900' }
  });
}

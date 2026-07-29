// Ported from frontend/src/components/CommentSheet.tsx — keep in sync.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomSheetModal from '@/components/BottomSheetModal';
import Icon from '@/components/Icon';
import Avatar from '@/components/Avatar';
import Sketchy from '@/components/Sketchy';
import SketchyInput from '@/components/SketchyInput';
import { useBottomInset } from '@/lib/useBottomInset';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useTheme } from '@/state/ThemeContext';
import { radius } from '@/theme/colors';

export default function CommentSheet() {
  const { commentPostId, closeComments } = useOverlay();
  const { posts, commentOnPost } = useAppState();
  const { colors } = useTheme();
  const bottomInset = useBottomInset();
  const styles = makeStyles(colors, bottomInset);
  const [text, setText] = useState('');

  const post = commentPostId ? posts.find((p) => p.id === commentPostId) : undefined;
  const open = Boolean(post);

  async function handleSend() {
    if (!post || !text.trim()) return;
    await commentOnPost(post.id, text.trim());
    setText('');
  }

  return (
    <BottomSheetModal open={open} onClose={closeComments}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>댓글</Text>
        <ScrollView style={{ maxHeight: 320 }}>
          {post && post.comments.length === 0 ? (
            <Text style={styles.empty}>아직 댓글이 없어요. 첫 댓글을 남겨보세요!</Text>
          ) : (
            post?.comments.map((c, i) => (
              <View key={i} style={styles.commentRow}>
                <Avatar nickname={c.user} color={c.avatarColor ?? '#E3D9BB'} avatarUrl={c.avatarUrl} size={26} fontSize={10} />
                <Text style={styles.commentText}>
                  <Text style={{ fontWeight: '700' }}>{c.user} </Text>
                  {c.text}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.inputRow}>
          <SketchyInput
            style={{ flex: 1, borderRadius: radius.pill }}
            placeholder="댓글 달기..."
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSend}
          />
          <Pressable onPress={handleSend}>
            <Sketchy radius={19} color={colors.paper} seed="comment-send" style={[styles.sendBtn, { borderWidth: 0 }]}>
              <Icon name="send" size={18} color={colors.paper} />
            </Sketchy>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
}

function makeStyles(colors: import('@/theme/colors').ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 16, paddingBottom: 24 + bottomInset },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 10 },
    title: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 10 },
    empty: { fontSize: 13, color: colors.inkSoft, paddingVertical: 20, textAlign: 'center' },
    commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6 },
    commentText: { flex: 1, fontSize: 13, color: colors.ink },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }
  });
}

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LockIcon, RotateCcwIcon, StatusTag } from '@/components/v0-primitives';
import {
  createExperienceGateway,
  type SessionInventory,
} from '@/features/identity-access/experience-api';
import { useWeddingTheme } from '@/theme';
import type { V0CommonProps } from './v0-types';

const experienceGateway = createExperienceGateway();

export function V0SessionsSubflow({ onLogout, onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [sessionsData, setSessionsData] = useState<SessionInventory | null>(null);
  const [loading, setLoading] = useState(Boolean(session));
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentSnapshot = session?.snapshot();
  const currentSessionId =
    currentSnapshot?.status === 'authenticated' ? currentSnapshot.actor.sessionId : null;

  const fetchSessions = useCallback(async () => {
    if (!session) return;
    try {
      const data = await session.authorize((token) => experienceGateway.listSessions(token));
      setSessionsData(data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Chưa tải được danh sách phiên đăng nhập từ máy chủ.',
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSessions();
  }, [fetchSessions]);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    await fetchSessions();
  };

  const handleRevoke = (sessionId: string) => {
    Alert.alert(
      'Thu hồi phiên đăng nhập',
      'Bạn có chắc chắn muốn đăng xuất phiên này từ xa? Thiết bị đó sẽ mất quyền truy cập ngay lập tức.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu hồi',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            setRevokingId(sessionId);
            try {
              await session.authorize((token) => experienceGateway.revokeSession(token, sessionId));
              Alert.alert('Thành công', 'Đã thu hồi phiên đăng nhập thành công.');
              await loadSessions();
            } catch (caught) {
              Alert.alert(
                'Lỗi thu hồi phiên',
                caught instanceof Error ? caught.message : 'Không thể thu hồi phiên đăng nhập.',
              );
            } finally {
              setRevokingId(null);
            }
          },
        },
      ],
    );
  };

  const sessions = sessionsData?.sessions ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về tài khoản"
          onPress={() => onNavigate('account')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Bảo mật tài khoản</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Phiên đăng nhập</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tải lại danh sách phiên"
          onPress={loadSessions}
          style={styles.refreshButton}
        >
          <RotateCcwIcon size={16} color={tokens.primary} />
        </Pressable>
      </View>

      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.premium, marginBottom: 16 },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.primary, marginBottom: 4 }]}>
          Quản lý thiết bị & Phiên truy cập
        </Text>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          Danh sách các thiết bị và trình duyệt hiện đang có quyền truy cập vào tài khoản cặp đôi
          của bạn. Bạn có thể thu hồi bất kỳ phiên nào từ xa để bảo vệ thông tin tiệc cưới.
        </Text>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {sessions.length > 0 ? (
        <View style={{ gap: 12 }}>
          {sessions.map((sess) => {
            const isCurrent = sess.sessionId === currentSessionId;
            const isRevoking = revokingId === sess.sessionId;

            return (
              <View
                key={sess.sessionId}
                style={[
                  styles.calloutCard,
                  {
                    backgroundColor: tokens.surface,
                    borderColor: isCurrent ? tokens.primary : tokens.rule,
                    borderWidth: isCurrent ? 1.5 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <LockIcon size={16} color={isCurrent ? tokens.primary : tokens.sage} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>
                      {sess.clientKind || 'Thiết bị'}
                    </Text>
                  </View>
                  <StatusTag tone={isCurrent ? 'success' : 'neutral'}>
                    {isCurrent ? 'Phiên này' : sess.status || 'Hoạt động'}
                  </StatusTag>
                </View>

                <View style={[styles.factRow, { marginTop: 8 }]}>
                  <Text style={{ fontSize: 12, color: tokens.muted }}>Mã phiên:</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'monospace', color: tokens.text }}>
                    {sess.sessionId.slice(0, 16)}…
                  </Text>
                </View>

                {sess.createdAt ? (
                  <View style={styles.factRow}>
                    <Text style={{ fontSize: 12, color: tokens.muted }}>Đăng nhập lúc:</Text>
                    <Text style={{ fontSize: 12, color: tokens.text }}>
                      {new Date(sess.createdAt).toLocaleString('vi-VN')}
                    </Text>
                  </View>
                ) : null}

                {sess.lastSeenAt ? (
                  <View style={styles.factRow}>
                    <Text style={{ fontSize: 12, color: tokens.muted }}>Hoạt động gần nhất:</Text>
                    <Text style={{ fontSize: 12, color: tokens.text }}>
                      {new Date(sess.lastSeenAt).toLocaleString('vi-VN')}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={{
                    marginTop: 12,
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    gap: 10,
                  }}
                >
                  {isCurrent ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Đăng xuất thiết bị này"
                      onPress={onLogout}
                      style={[styles.outlineButton, { borderColor: tokens.champagne }]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.tagWarmText }}>
                        Đăng xuất thiết bị này
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Thu hồi phiên ${sess.sessionId.slice(0, 8)}`}
                      disabled={isRevoking}
                      onPress={() => handleRevoke(sess.sessionId)}
                      style={[
                        styles.outlineButton,
                        { borderColor: tokens.rule, opacity: isRevoking ? 0.5 : 1 },
                      ]}
                    >
                      {isRevoking ? (
                        <ActivityIndicator size="small" color={tokens.tagWarmText} />
                      ) : (
                        <Text
                          style={{ fontSize: 12, fontWeight: '600', color: tokens.tagWarmText }}
                        >
                          Thu hồi quyền truy cập
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : !loading ? (
        <View style={styles.emptyCard}>
          <LockIcon size={24} color={tokens.sage} />
          <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
            Không tìm thấy thông tin phiên
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    fontSize: 26,
    lineHeight: 28,
  },
  headerTitleWrap: { flex: 1 },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  calloutCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  calloutSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  outlineButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

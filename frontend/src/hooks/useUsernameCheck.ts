import { useEffect, useState } from 'react';
import * as userApi from '@/api/userApi';

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const USERNAME_FORMAT = /^[a-zA-Z0-9_.]+$/;

/** 아이디 형식 검사 + 디바운스된 중복 확인. 빈 문자열을 넘기면 'idle'을 유지합니다. */
export function useUsernameCheck(username: string, excludeUserId?: string): UsernameStatus {
  const [status, setStatus] = useState<UsernameStatus>('idle');

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setStatus('idle');
      return;
    }
    if (!USERNAME_FORMAT.test(trimmed)) {
      setStatus('invalid');
      return;
    }

    setStatus('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      userApi
        .isUsernameAvailable(trimmed, excludeUserId)
        .then((available) => {
          if (!cancelled) setStatus(available ? 'available' : 'taken');
        })
        .catch(() => {
          if (!cancelled) setStatus('idle');
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, excludeUserId]);

  return status;
}

export function usernameStatusMessage(status: UsernameStatus): { text: string; color: string } | null {
  switch (status) {
    case 'checking':
      return null;
    case 'available':
      return { text: '사용할 수 있는 아이디예요', color: 'var(--ink-soft)' };
    case 'taken':
      return { text: '이미 사용 중인 아이디예요', color: 'var(--danger)' };
    case 'invalid':
      return { text: '아이디는 영문, 숫자, ., _ 만 사용할 수 있어요', color: 'var(--danger)' };
    default:
      return null;
  }
}

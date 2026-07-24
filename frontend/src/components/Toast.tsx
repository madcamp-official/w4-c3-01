import { useToast } from '@/state/ToastContext';

export default function Toast() {
  const { message, visible } = useToast();
  return <div className={'toast' + (visible ? ' show' : '')}>{message}</div>;
}

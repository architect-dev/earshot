import { useLastSeenString } from '@/hooks/useIsOnline';
import { Timestamp } from 'firebase/firestore';
import { TextProps, Text } from './Text';

interface LastSeenTextProps extends TextProps {
  lastSeen: Timestamp | null | undefined;
}

export const LastSeenText = ({ lastSeen, ...props }: LastSeenTextProps) => {
  let lastSeenString = useLastSeenString(lastSeen);
  if (lastSeenString === '') return null;
  return <Text {...props}>{lastSeenString}</Text>;
};

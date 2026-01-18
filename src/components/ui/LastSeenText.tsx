import { useLastSeenString } from '@/contexts/PresenceContext';
import { TextProps, Text } from './Text';

interface LastSeenTextProps extends TextProps {
  userId: string | null | undefined;
}

export const LastSeenText = ({ userId, ...props }: LastSeenTextProps) => {
  const lastSeenString = useLastSeenString(userId);
  if (lastSeenString === '') return null;
  return <Text {...props}>{lastSeenString}</Text>;
};

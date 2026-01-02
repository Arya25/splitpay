import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Text, TextProps } from 'react-native';

type ThemedTextProps = TextProps & {
  type?: 'default' | 'defaultSemiBold' | 'title' | 'subtitle' | 'link';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  const theme = useColorScheme() ?? 'light';
  const color = Colors[theme].text;

  const getFontWeight = () => {
    switch (type) {
      case 'defaultSemiBold':
        return '600';
      case 'title':
        return '700';
      case 'subtitle':
        return '500';
      default:
        return 'normal';
    }
  };

  const getFontSize = () => {
    switch (type) {
      case 'title':
        return 20;
      case 'subtitle':
        return 16;
      default:
        return 14;
    }
  };

  return (
    <Text
      style={[
        {
          color,
          fontWeight: getFontWeight(),
          fontSize: getFontSize(),
        },
        style,
      ]}
      {...rest}
    />
  );
}
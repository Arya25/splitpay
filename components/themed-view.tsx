import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { View, ViewProps } from 'react-native';

type ThemedViewProps = ViewProps;

export function ThemedView({ style, ...rest }: ThemedViewProps) {
  const theme = useColorScheme() ?? 'light';
  const backgroundColor = Colors[theme].background;

  return (
    <View
      style={[
        {
          backgroundColor,
        },
        style,
      ]}
      {...rest}
    />
  );
}
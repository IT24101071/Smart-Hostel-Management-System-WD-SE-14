import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
};

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightElement,
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color={COLORS.white} />
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.right}>
        {rightElement ?? <View style={styles.placeholder} />}
      </View>
    </View>
  );
}

export function HeaderIconButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.iconButton} onPress={onPress} hitSlop={8}>
      <Ionicons name={icon} size={20} color={COLORS.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
  },
  title: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: COLORS.white,
  },
  subtitle: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  right: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 36,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

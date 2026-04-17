import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LANDING } from '../../landing/landingTheme';
import { COLORS } from '../../../constants/colors';

const CAROUSEL_HEIGHT = 500;

export default function RoomImageCarousel({ uris, accentColor = LANDING.accent }) {
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const width = Dimensions.get('window').width;

  const onMomentumEnd = useCallback(
    (e) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / width);
      setIndex(Math.max(0, Math.min(next, (uris?.length ?? 1) - 1)));
    },
    [uris?.length, width],
  );

  const goPrev = useCallback(() => {
    const next = Math.max(0, index - 1);
    listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    setIndex(next);
  }, [index, width]);

  const goNext = useCallback(() => {
    const max = Math.max(0, (uris?.length ?? 1) - 1);
    const next = Math.min(max, index + 1);
    listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    setIndex(next);
  }, [index, uris?.length, width]);

  if (!uris?.length) {
    return (
      <View style={[styles.slide, styles.placeholder, { width }]}>
        <Text style={styles.placeholderText}>No photos for this room</Text>
      </View>
    );
  }

  return (
    <View style={styles.carouselWrap}>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={uris}
        keyExtractor={(item, i) => `${item}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={[styles.slide, { width }]}
            contentFit="cover"
            transition={200}
          />
        )}
      />
      {uris.length > 1 && (
        <>
          <Pressable
            style={[styles.arrow, styles.arrowLeft]}
            onPress={goPrev}
            hitSlop={12}
            accessibilityLabel="Previous image"
          >
            <Ionicons name="chevron-back" size={28} color={accentColor} />
          </Pressable>
          <Pressable
            style={[styles.arrow, styles.arrowRight]}
            onPress={goNext}
            hitSlop={12}
            accessibilityLabel="Next image"
          >
            <Ionicons name="chevron-forward" size={28} color={accentColor} />
          </Pressable>
          <View style={styles.dots} pointerEvents="none">
            {uris.map((_, i) => (
              <View
                key={`dot-${i}`}
                style={[
                  styles.dot,
                  i === index ? styles.dotActive : styles.dotInactive,
                  { borderColor: accentColor },
                ]}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  carouselWrap: {
    position: 'relative',
  },
  list: {
    height: CAROUSEL_HEIGHT,
  },
  slide: {
    height: CAROUSEL_HEIGHT,
    backgroundColor: '#E5E7EB',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: LANDING.textMuted,
  },
  arrow: {
    position: 'absolute',
    top: CAROUSEL_HEIGHT / 2 - 22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },
  dots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});

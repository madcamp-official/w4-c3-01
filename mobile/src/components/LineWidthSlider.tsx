import { useMemo, useState } from 'react';
import {
  PanResponder,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '@/theme/colors';

type Props = {
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  onValueChange: (value: number) => void;
  variant?: 'light' | 'dark';
};

export default function LineWidthSlider({
  value,
  minimumValue = 4,
  maximumValue = 20,
  step = 2,
  onValueChange,
  variant = 'light',
}: Props) {
  const dark = variant === 'dark';
  const [trackWidth, setTrackWidth] = useState(0);
  const range = maximumValue - minimumValue;
  const progress = range > 0 ? (value - minimumValue) / range : 0;

  const updateFromTouch = (event: GestureResponderEvent) => {
    if (trackWidth <= 0 || range <= 0) return;
    const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / trackWidth));
    const steppedValue =
      minimumValue + Math.round((ratio * range) / step) * step;
    onValueChange(Math.max(minimumValue, Math.min(maximumValue, steppedValue)));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: updateFromTouch,
        onPanResponderMove: updateFromTouch,
      }),
    [maximumValue, minimumValue, onValueChange, range, step, trackWidth],
  );

  const changeBy = (amount: number) => {
    onValueChange(Math.max(minimumValue, Math.min(maximumValue, value + amount)));
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, dark && styles.darkLabel]}>라인</Text>
      <View
        accessibilityActions={[
          { name: 'increment', label: '라인 굵게' },
          { name: 'decrement', label: '라인 얇게' },
        ]}
        accessibilityLabel="라인 굵기"
        accessibilityRole="adjustable"
        accessibilityValue={{ min: minimumValue, max: maximumValue, now: value }}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') changeBy(step);
          if (event.nativeEvent.actionName === 'decrement') changeBy(-step);
        }}
        onLayout={(event: LayoutChangeEvent) =>
          setTrackWidth(event.nativeEvent.layout.width)
        }
        style={styles.trackTouchArea}
        {...panResponder.panHandlers}>
        <View style={[styles.track, dark && styles.darkTrack]}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={[styles.thumb, dark && styles.darkThumb, { left: `${progress * 100}%` }]}>
          <View
            style={[
              styles.preview,
              {
                width: Math.max(6, value),
                height: Math.max(6, value),
                borderRadius: Math.max(3, value / 2),
              },
            ]}
          />
        </View>
      </View>
      <Text style={[styles.value, dark && styles.darkValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 150,
  },
  label: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  trackTouchArea: {
    width: 84,
    height: 34,
    justifyContent: 'center',
  },
  track: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.paper2,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  thumb: {
    position: 'absolute',
    top: 17,
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.paper,
  },
  preview: {
    backgroundColor: colors.ink,
  },
  value: {
    minWidth: 18,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  darkLabel: { color: 'rgba(255,255,255,0.62)' },
  darkTrack: { backgroundColor: 'rgba(255,255,255,0.18)' },
  darkThumb: { backgroundColor: '#101114', borderColor: '#FF8B9B' },
  darkValue: { color: '#FFFFFF' },
});

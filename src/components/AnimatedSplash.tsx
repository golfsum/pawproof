import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '@/theme';

/**
 * Walks 4 paw prints down the screen in an alternating zigzag, then fades in
 * the PawProof wordmark. Holds until the host says it's ready, then fades
 * itself out. Rendered as an overlay on top of everything.
 *
 * Uses the React Native Animated API (not Reanimated) — these are short,
 * cheap transform/opacity tweens that drive on the native side via
 * useNativeDriver, no worklet plumbing needed.
 */

const PAW_COUNT = 4;
const PAW_OFFSET_X = 38;   // horizontal stagger between left and right paws
const PAW_GAP_Y = -4;      // tighten the vertical spacing (the paw glyph has slack)
const PAW_TILT = 24;       // tilt left paws -24°, right paws +24° — "walking forward"

interface Props {
  /** True once the app is ready to be revealed (auth resolved, etc). */
  ready: boolean;
  /** Called once the fade-out completes; host should unmount the splash. */
  onHidden?: () => void;
}

export function AnimatedSplash({ ready, onHidden }: Props) {
  const paws = useRef(Array.from({ length: PAW_COUNT }, () => new Animated.Value(0))).current;
  const wordmark = useRef(new Animated.Value(0)).current;
  const overlay = useRef(new Animated.Value(1)).current;

  // Refs so the "ready may flip before animation finishes" race is correct
  // without re-running the animation effect.
  const animDoneRef = useRef(false);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  const fadeOut = useCallback(() => {
    Animated.timing(overlay, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => onHidden?.());
  }, [overlay, onHidden]);

  // Kick off the intro animation on mount.
  useEffect(() => {
    Animated.sequence([
      Animated.stagger(
        180,
        paws.map(v =>
          Animated.spring(v, {
            toValue: 1,
            friction: 6,
            tension: 90,
            useNativeDriver: true,
          }),
        ),
      ),
      Animated.timing(wordmark, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      animDoneRef.current = true;
      if (readyRef.current) fadeOut();
    });
  }, [paws, wordmark, fadeOut]);

  // If host becomes ready *after* the animation finishes, fade out.
  useEffect(() => {
    if (ready && animDoneRef.current) {
      fadeOut();
    }
  }, [ready, fadeOut]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.bg, { opacity: overlay }]}
    >
      <View style={styles.stack}>
        {paws.map((v, i) => {
          const isLeft = i % 2 === 0;
          return (
            <Animated.View
              key={i}
              style={[
                styles.paw,
                {
                  opacity: v,
                  transform: [
                    { translateX: isLeft ? -PAW_OFFSET_X : PAW_OFFSET_X },
                    {
                      translateY: v.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                    {
                      scale: v.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1.35, 1],
                      }),
                    },
                    { rotate: isLeft ? `-${PAW_TILT}deg` : `${PAW_TILT}deg` },
                  ],
                },
              ]}
            >
              <MaterialCommunityIcons name="paw" size={58} color={colors.primary} />
            </Animated.View>
          );
        })}

        <Animated.View
          style={[
            styles.wordmarkWrap,
            {
              opacity: wordmark,
              transform: [
                {
                  translateY: wordmark.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.title}>PawProof</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: {
    // Cream background to match the new icon / splash image. Paws and
    // wordmark render in brand teal on top.
    backgroundColor: '#FAF1DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: { alignItems: 'center' },
  paw: { marginVertical: PAW_GAP_Y },
  wordmarkWrap: { marginTop: 36 },
  title: {
    fontFamily: fonts.display.bold,
    fontSize: 38,
    color: colors.primaryDark,
    letterSpacing: -0.5,
  },
});

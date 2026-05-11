/**
 * AnimatedSplash — entrance animation layered over the native splash so the
 * handoff to the JS layer feels deliberate instead of abrupt.
 *
 * Sequence (timings are tight so this never feels like a delay):
 *   0ms    background (matches native splashscreen, no flash)
 *   0ms    primary glow blooms up from centre (900ms)
 *   150ms  splash icon fades in + scales from 0.88 (750ms)
 *   800ms  pulse ring expands outward and fades (650ms)
 *   1100ms hold
 *   1600ms exit: image scales up slightly + fades out (500ms)
 *   2100ms onDone()
 */

import { useEffect, useRef } from 'react';
import {
    Animated,
    Easing,
    StyleSheet,
    Dimensions
} from 'react-native';
import { DARK } from '../theme/colors';

const { width, height } = Dimensions.get('window');
const BG = DARK.bg;
const GLOW_COLOR = DARK.primary;

// Glow + ring sit at screen-centre because our generated splash-icon
// is a trimmed glyph composited onto a transparent square canvas (see
// icons.mjs renderFromScratch — splash mode). With resizeMode:contain
// the visible logo lands at the centre of the screen. If you swap the
// asset for one where the logo is OFF-centre inside the file, set this
// to compensate (e.g. tranqs used `-(height * 0.04) + 5`).
const LOGO_Y_OFFSET = 0;

interface Props {
    onDone?: () => void;
}

export default function AnimatedSplash({ onDone }: Props) {
    const glowOp = useRef(new Animated.Value(0)).current;
    const glowSc = useRef(new Animated.Value(0.3)).current;
    const ringOp = useRef(new Animated.Value(0)).current;
    const ringSc = useRef(new Animated.Value(0.6)).current;
    const logoOp = useRef(new Animated.Value(0)).current;
    const logoSc = useRef(new Animated.Value(0.88)).current;
    const exitOp = useRef(new Animated.Value(1)).current;
    const exitSc = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            // Phase 1: entrance
            Animated.parallel([
                Animated.timing(glowOp, {
                    toValue: 0.22,
                    duration: 900,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true
                }),
                Animated.timing(glowSc, {
                    toValue: 1,
                    duration: 900,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true
                }),
                Animated.sequence([
                    Animated.delay(150),
                    Animated.parallel([
                        Animated.timing(logoOp, {
                            toValue: 1,
                            duration: 750,
                            easing: Easing.out(Easing.quad),
                            useNativeDriver: true
                        }),
                        Animated.timing(logoSc, {
                            toValue: 1,
                            duration: 850,
                            easing: Easing.out(Easing.back(1.05)),
                            useNativeDriver: true
                        })
                    ])
                ])
            ]),

            // Phase 2: pulse ring expands outward
            Animated.parallel([
                Animated.timing(ringOp, {
                    toValue: 0.18,
                    duration: 200,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true
                }),
                Animated.timing(ringSc, {
                    toValue: 1.35,
                    duration: 650,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true
                }),
                Animated.sequence([
                    Animated.delay(150),
                    Animated.timing(ringOp, {
                        toValue: 0,
                        duration: 500,
                        easing: Easing.in(Easing.quad),
                        useNativeDriver: true
                    })
                ])
            ]),

            // Phase 3: hold
            Animated.delay(420),

            // Phase 4: exit
            Animated.parallel([
                Animated.timing(exitOp, {
                    toValue: 0,
                    duration: 480,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true
                }),
                Animated.timing(exitSc, {
                    toValue: 1.06,
                    duration: 500,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true
                })
            ])
        ]).start(() => {
            if (onDone) {
                onDone();
            }
        });
    }, []);

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                s.root,
                { opacity: exitOp, transform: [{ scale: exitSc }] }
            ]}
        >
            <Animated.View
                style={[
                    s.glow,
                    {
                        opacity: glowOp,
                        transform: [
                            { scale: glowSc },
                            { translateY: LOGO_Y_OFFSET }
                        ]
                    }
                ]}
            />

            <Animated.View
                style={[
                    s.ring,
                    {
                        opacity: ringOp,
                        transform: [
                            { scale: ringSc },
                            { translateY: LOGO_Y_OFFSET }
                        ]
                    }
                ]}
            />

            <Animated.Image
                source={require('../../assets/splash-icon.png')}
                style={[
                    s.splash,
                    { opacity: logoOp, transform: [{ scale: logoSc }] }
                ]}
                resizeMode="contain"
            />
        </Animated.View>
    );
}

const GLOW_SIZE = width * 0.65;
const RING_SIZE = width * 0.58;

const s = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: BG,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999
    },
    glow: {
        position: 'absolute',
        width: GLOW_SIZE,
        height: GLOW_SIZE,
        borderRadius: GLOW_SIZE / 2,
        backgroundColor: GLOW_COLOR
    },
    ring: {
        position: 'absolute',
        width: RING_SIZE,
        height: RING_SIZE,
        borderRadius: RING_SIZE / 2,
        borderWidth: 1.5,
        borderColor: GLOW_COLOR,
        backgroundColor: 'transparent'
    },
    splash: {
        // The image is a 1200×1200 transparent canvas with a centered
        // glyph at ~55% scale. Sizing the View to ~60% of the screen
        // (instead of full-bleed) tightens the visible logo without
        // touching the asset itself.
        width: Math.min(width, height) * 0.6,
        height: Math.min(width, height) * 0.6
    }
});

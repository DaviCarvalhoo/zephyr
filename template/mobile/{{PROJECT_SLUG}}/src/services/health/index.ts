/**
 * Health — unified surface over Apple Health (iOS, react-native-health)
 * and Health Connect (Android, react-native-health-connect).
 *
 * Both libraries are lazy-loaded with try/require so Expo Go (which
 * has neither linked) gets a no-op service instead of a hard crash.
 *
 * The module exposes a small, opinionated API:
 *   - requestPermissions  — surface the platform's permissions UI
 *   - getStepsToday        — read example
 *   - writeExerciseSession — write example: minutes-of-X workout
 *
 * Adapt to whatever data your app actually cares about. Mirror this
 * shape: one method per "thing the app needs" rather than
 * one-method-per-data-type, so a swap of platforms or libraries
 * stays a contained change.
 *
 * All errors are swallowed by callers — health is best-effort.
 * Returns null / 0 on failure rather than throwing.
 */

import { Platform } from 'react-native';

// ── iOS HealthKit (react-native-health) ──────────────────────────────
interface AppleHealthKit {
    initHealthKit: (
        options: unknown,
        cb: (err: string | null) => void
    ) => void;
    getStepCount: (
        opts: unknown,
        cb: (err: string | null, result: { value: number }) => void
    ) => void;
    saveWorkout: (
        opts: unknown,
        cb: (err: string | null) => void
    ) => void;
    Constants?: { Permissions?: Record<string, string> };
}

// ── Android Health Connect (react-native-health-connect) ─────────────
interface HealthConnect {
    initialize: () => Promise<boolean>;
    requestPermission: (
        permissions: { accessType: string; recordType: string }[]
    ) => Promise<{ accessType: string; recordType: string }[]>;
    readRecords: (
        recordType: string,
        opts: { timeRangeFilter: { operator: string; startTime: string; endTime: string } }
    ) => Promise<{ records: { count: number }[] }>;
    insertRecords: (records: unknown[]) => Promise<unknown>;
}

let _appleHealth: AppleHealthKit | null | undefined = undefined;
let _healthConnect: HealthConnect | null | undefined = undefined;

function getAppleHealth(): AppleHealthKit | null {
    if (Platform.OS !== 'ios') {
        return null;
    }
    if (_appleHealth !== undefined) {
        return _appleHealth;
    }
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pkg = require('react-native-health');
        _appleHealth = (pkg.default ?? pkg) as AppleHealthKit;
    } catch {
        _appleHealth = null;
    }
    return _appleHealth;
}

function getHealthConnect(): HealthConnect | null {
    if (Platform.OS !== 'android') {
        return null;
    }
    if (_healthConnect !== undefined) {
        return _healthConnect;
    }
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        _healthConnect = require('react-native-health-connect') as
            HealthConnect;
    } catch {
        _healthConnect = null;
    }
    return _healthConnect;
}

const APPLE_PERMISSIONS = {
    permissions: {
        read:  ['Steps'],
        write: ['Workout']
    }
};

const ANDROID_PERMISSIONS = [
    { accessType: 'read',  recordType: 'Steps' },
    { accessType: 'write', recordType: 'ExerciseSession' }
];

/**
 * Surface the platform's permission sheet. Returns true if the user
 * granted enough permissions for our subsequent reads/writes to work.
 */
export async function requestHealthPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
        const ahk = getAppleHealth();
        if (!ahk) {
            return false;
        }
        return new Promise(resolve => {
            ahk.initHealthKit(APPLE_PERMISSIONS, err => {
                resolve(!err);
            });
        });
    }
    if (Platform.OS === 'android') {
        const hc = getHealthConnect();
        if (!hc) {
            return false;
        }
        try {
            const ready = await hc.initialize();
            if (!ready) {
                return false;
            }
            const granted = await hc.requestPermission(
                ANDROID_PERMISSIONS
            );
            return granted.length === ANDROID_PERMISSIONS.length;
        } catch {
            return false;
        }
    }
    return false;
}

export async function getStepsToday(): Promise<number> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();

    if (Platform.OS === 'ios') {
        const ahk = getAppleHealth();
        if (!ahk) {
            return 0;
        }
        return new Promise(resolve => {
            ahk.getStepCount({ date: end.toISOString() }, (err, res) => {
                if (err) {
                    resolve(0);
                    return;
                }
                resolve(res?.value ?? 0);
            });
        });
    }
    if (Platform.OS === 'android') {
        const hc = getHealthConnect();
        if (!hc) {
            return 0;
        }
        try {
            const res = await hc.readRecords('Steps', {
                timeRangeFilter: {
                    operator: 'between',
                    startTime: start.toISOString(),
                    endTime: end.toISOString()
                }
            });
            return res.records.reduce((sum, r) => sum + (r.count ?? 0), 0);
        } catch {
            return 0;
        }
    }
    return 0;
}

export interface ExerciseSession {
    type: string;
    startedAt: Date;
    durationMs: number;
    energyBurned?: number;
}

/**
 * Write a completed exercise session to the platform's health store.
 * `type` is loosely free-form on iOS (Apple maps it to HKWorkoutType)
 * and constrained on Android (must be a Health Connect ExerciseType).
 * For barebones we leave the mapping to the caller — wrap this in a
 * domain method like `recordYogaSession` if you only ever record one
 * kind.
 */
export async function writeExerciseSession(
    s: ExerciseSession
): Promise<boolean> {
    const startISO = s.startedAt.toISOString();
    const endISO = new Date(
        s.startedAt.getTime() + s.durationMs
    ).toISOString();

    if (Platform.OS === 'ios') {
        const ahk = getAppleHealth();
        if (!ahk) {
            return false;
        }
        return new Promise(resolve => {
            ahk.saveWorkout({
                type: s.type,
                startDate: startISO,
                endDate: endISO,
                energyBurned: s.energyBurned ?? 0,
                energyBurnedUnit: 'kilocalorie'
            }, err => resolve(!err));
        });
    }
    if (Platform.OS === 'android') {
        const hc = getHealthConnect();
        if (!hc) {
            return false;
        }
        try {
            await hc.insertRecords([{
                recordType: 'ExerciseSession',
                exerciseType: s.type,
                startTime: startISO,
                endTime: endISO,
                title: s.type
            }]);
            return true;
        } catch {
            return false;
        }
    }
    return false;
}

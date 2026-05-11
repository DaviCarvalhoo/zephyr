// Mobile theme palette. Generated from the project's primaryColor at scaffold
// time and kept in lock-step with ui/admin's CSS variables — same intent,
// expressed as RN-native hex values.
//
// Edit `template-variables.mjs` (in davicarvalhoo-cli) to change how these are
// derived; on the mobile side just consume `useTheme().colors`.

export interface ThemePalette {
    bg: string;
    bgSoft: string;
    card: string;
    primary: string;
    primaryLight: string;
    text: string;
    textSec: string;
    textMuted: string;
    border: string;
    tabBg: string;
    tabBorder: string;
    statusBar: 'light-content' | 'dark-content';
}

export const LIGHT: ThemePalette = {
    bg: '#F8F9FA',
    bgSoft: '#EFF1F3',
    card: '#FFFFFF',
    primary: '{{PRIMARY_COLOR}}',
    primaryLight: '{{PRIMARY_COLOR_LIGHT}}',
    text: '#0B0D0F',
    textSec: '#4A5260',
    textMuted: '#8A9099',
    border: '#E2E5E9',
    tabBg: '#FFFFFF',
    tabBorder: '#E2E5E9',
    statusBar: 'dark-content'
};

export const DARK: ThemePalette = {
    bg: '#0B0D0F',
    bgSoft: '#12161A',
    card: '#171C21',
    primary: '{{PRIMARY_COLOR_DARK}}',
    primaryLight: '{{PRIMARY_COLOR_DARK_LIGHT}}',
    text: '#F0F2F5',
    textSec: '#8A9099',
    textMuted: '#3D4450',
    border: '#1E2530',
    tabBg: '#0E1114',
    tabBorder: '#1A2028',
    statusBar: 'light-content'
};

// Per-feature accent colors (same in dark and light).
export const ACCENTS = {
    blue:   '#60A5FA',
    purple: '#8B5CF6',
    green:  '#6EE7B7',
    amber:  '#F59E0B',
    pink:   '#F472B6',
    red:    '#F87171'
} as const;

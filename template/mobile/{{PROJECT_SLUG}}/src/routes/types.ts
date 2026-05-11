// Strongly-typed route parameter lists for React Navigation.
// Adding a screen? Add it here too — TypeScript will then verify
// `navigation.navigate()` calls and screen prop types across the app.

export type AuthStackParamList = {
    AuthLanding: undefined;
    Login: undefined;
    Signup: undefined;
    ForgotPassword: undefined;
};

export type OnboardingStackParamList = {
    Welcome: undefined;
    Onboarding: undefined;
    FirstAction: undefined;
};

export type AppStackParamList = {
    MainTabs: undefined;
    /** Modal — present from anywhere via navigation.navigate('AuthStack'). */
    AuthStack: undefined;
};

export type MainTabsParamList = {
    Home: undefined;
    Explore: undefined;
    /** Center CTA — primary action of the app. */
    Action: undefined;
    Library: undefined;
    Profile: undefined;
};

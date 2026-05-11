import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

export default [
    ...tseslint.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        plugins: {
            "@stylistic": stylistic
        },
        rules: {
            "@stylistic/indent": ["error", 4],
            "@stylistic/semi": ["error", "always"],
            "@stylistic/max-len": ["error", { "code": 80 }],
            "curly": ["error", "all"]
        }
    }
];

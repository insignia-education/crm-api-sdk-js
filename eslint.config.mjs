import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["src/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.node,
                fetch: "readonly",
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "warn",
        },
    },
    {
        files: ["tests/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
                fetch: "readonly",
            },
        },
    },
];

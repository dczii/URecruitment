import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const HEX_COLOUR = /#[\da-f]{3,8}\b/i;
const PIXEL_FONT_SIZE =
  /\btext-\[(?:\d+(?:\.\d+)?|\.\d+)px\]|\bfont-size\s*:\s*(?:\d+(?:\.\d+)?|\.\d+)px\b/i;

const noHardcodedDesignValues = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require semantic design tokens for component colours and font sizes",
    },
    schema: [],
    messages: {
      hexColour:
        "Use a semantic colour token instead of a hexadecimal colour in src/components.",
      pixelFontSize:
        "Use a typography token instead of a raw pixel font size in src/components.",
    },
  },
  create(context) {
    function check(node, value) {
      if (HEX_COLOUR.test(value)) {
        context.report({ node, messageId: "hexColour" });
      }
      if (PIXEL_FONT_SIZE.test(value)) {
        context.report({ node, messageId: "pixelFontSize" });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === "string") {
          check(node, node.value);
        }
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "design-tokens": {
        rules: {
          "no-hardcoded": noHardcodedDesignValues,
        },
      },
    },
    rules: {
      "design-tokens/no-hardcoded": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;

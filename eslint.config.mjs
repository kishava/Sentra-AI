import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  { ignores: [".next-dev/**", ".next/**", "scripts/**", "cloudflare/**", "tmp/**"] },
  ...nextVitals,
  ...nextTypescript,
];

export default eslintConfig;

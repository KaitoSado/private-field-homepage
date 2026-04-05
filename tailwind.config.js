/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./src/**/*.{js,jsx}"
  ],
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {}
  },
  plugins: []
};

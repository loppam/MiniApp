/** @type {import('tailwindcss').Config} */
import variants from 'tailwindcss-variants/plugin';

export const content = ["./src/**/*.{js,ts,jsx,tsx}"];
export const theme = {
  extend: {},
};
export const plugins = [variants];

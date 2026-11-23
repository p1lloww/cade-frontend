import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Tema dos componentes PrimeNG: Aura com o azul "céu" do Cadê? (--color-sky e --color-primary em styles.scss).
 * O botão principal usa o tom 700 (#0A5F86) porque o 500 (#078BBB) não tem contraste AA com texto branco (RNF10).
 */
export const CadePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eaf4f9',
      100: '#d2e8f3',
      200: '#a6d1e6',
      300: '#6fb6d6',
      400: '#3a9fca',
      500: '#078bbb',
      600: '#08759f',
      700: '#0a5f86',
      800: '#074a69',
      900: '#06384f',
      950: '#042535',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        text: {
          color: '#254514',
          hoverColor: '#1f3a12',
          mutedColor: '#4f5f47',
          hoverMutedColor: '#254514',
        },
      },
    },
  },
});

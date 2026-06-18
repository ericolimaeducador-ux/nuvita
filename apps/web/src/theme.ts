import type { ThemeConfig } from 'antd';

/**
 * Tema "hospitalar" — paleta clínica em azul-petróleo/teal, alta densidade
 * de informação (tabelas e formulários), cantos discretos. Inspirado no
 * visual de ERPs hospitalares (sidebar escura + área de trabalho clara).
 */
export const BRAND = {
  primary: '#0d6e9e',
  primaryDark: '#0a5880',
  accent: '#15a0a0',
  sider: '#0b2740',
  siderHover: '#123653',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  bg: '#f1f5f9',
};

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: BRAND.primary,
    colorInfo: BRAND.primary,
    colorSuccess: BRAND.success,
    colorWarning: BRAND.warning,
    colorError: BRAND.error,
    colorLink: BRAND.primary,
    borderRadius: 6,
    fontSize: 14,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    colorBgLayout: BRAND.bg,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 56,
      headerPadding: '0 20px',
      siderBg: BRAND.sider,
      bodyBg: BRAND.bg,
    },
    Menu: {
      darkItemBg: BRAND.sider,
      darkSubMenuItemBg: '#08203a',
      darkItemSelectedBg: BRAND.primary,
      darkItemHoverBg: BRAND.siderHover,
      itemBorderRadius: 6,
      itemMarginInline: 8,
    },
    Table: {
      headerBg: '#eef2f6',
      headerColor: '#334155',
      rowHoverBg: '#f0f7fb',
      cellPaddingBlock: 10,
    },
    Card: {
      borderRadiusLG: 10,
    },
    Statistic: {
      titleFontSize: 13,
    },
  },
};

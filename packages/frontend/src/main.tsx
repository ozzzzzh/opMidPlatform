import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'antd/dist/reset.css';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

function RootApp() {
  const { language } = useI18n();

  return (
    <ConfigProvider
      locale={language === 'en' ? enUS : zhCN}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          colorInfo: '#2563eb',
          colorSuccess: '#2f855a',
          colorWarning: '#b7791f',
          colorError: '#b91c1c',
          colorText: '#111827',
          colorTextSecondary: '#6b7280',
          colorBorder: '#dfe3e8',
          colorBgLayout: '#f5f6f8',
          borderRadius: 6,
          borderRadiusLG: 8,
          borderRadiusSM: 4,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif",
        },
        components: {
          Layout: {
            headerBg: '#ffffff',
            bodyBg: '#f5f6f8',
            siderBg: '#ffffff',
          },
          Menu: {
            itemHeight: 40,
            itemBorderRadius: 6,
            itemMarginInline: 8,
            itemSelectedBg: '#eaf1ff',
            itemSelectedColor: '#1d4ed8',
            itemColor: '#374151',
          },
          Table: {
            headerBg: '#f7f8fa',
            headerColor: '#4b5563',
            borderColor: '#e8ebef',
            headerSplitColor: '#e8ebef',
          },
          Card: {
            borderRadiusLG: 10,
          },
          Modal: {
            borderRadiusLG: 10,
          },
          Tag: {
            borderRadiusSM: 4,
          },
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <RootApp />
      </QueryClientProvider>
    </I18nProvider>
  </React.StrictMode>,
);

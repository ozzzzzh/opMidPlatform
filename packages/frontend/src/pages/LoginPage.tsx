import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Form, Input } from 'antd';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/client';
import type { LoginPayload } from '@/api/auth';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import LanguageSwitcher from '@/i18n/LanguageSwitcher';

export default function LoginPage() {
  const { token, login } = useAuth();
  const { t } = useI18n();
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const rawRedirect = new URLSearchParams(location.search).get('redirect');
  const redirect =
    rawRedirect &&
    rawRedirect.startsWith('/') &&
    !rawRedirect.startsWith('//') &&
    !rawRedirect.startsWith('/login')
      ? rawRedirect
      : '/';

  if (token) {
    return <Navigate to={redirect} replace />;
  }

  const handleSubmit = async (values: LoginPayload) => {
    setSubmitting(true);
    try {
      await login(values);
      navigate(redirect, { replace: true });
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <Link to="/report" className="auth-brand">
        {t('common.brand')}
      </Link>
      <div className="auth-language">
        <LanguageSwitcher />
      </div>

      <div className="auth-box">
        <h1>
          <span className="title-icon">
            <SafetyCertificateOutlined />
          </span>
          {t('login.title')}
        </h1>
        <p className="auth-desc">{t('login.description')}</p>

        <Form<LoginPayload>
          layout="vertical"
          size="large"
          requiredMark={false}
          onFinish={handleSubmit}
          autoComplete="on"
        >
          <Form.Item
            label={t('login.username')}
            name="username"
            rules={[{ required: true, message: t('login.requiredUsername') }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('login.usernamePlaceholder')}
              autoComplete="username"
              autoFocus
            />
          </Form.Item>

          <Form.Item
            label={t('login.password')}
            name="password"
            rules={[{ required: true, message: t('login.requiredPassword') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('login.passwordPlaceholder')}
              autoComplete="current-password"
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={submitting}>
            {t('login.submit')}
          </Button>
        </Form>

        <div className="auth-switch">
          <Link to="/report">{t('login.back')}</Link>
        </div>
      </div>
    </div>
  );
}

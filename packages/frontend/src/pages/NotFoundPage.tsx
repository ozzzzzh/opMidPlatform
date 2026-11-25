import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <Result
      status="404"
      title="404"
      subTitle={t('notFound.title')}
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          {t('notFound.back')}
        </Button>
      }
    />
  );
}

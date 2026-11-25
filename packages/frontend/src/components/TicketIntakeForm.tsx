import {
  AppstoreOutlined,
  CalendarOutlined,
  CloudServerOutlined,
  FireFilled,
  LaptopOutlined,
  PlusOutlined,
  SendOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App as AntdApp,
  Button,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Radio,
  Row,
  Select,
  Upload,
  type UploadFile,
  type UploadProps,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState, type ReactNode } from 'react';
import { Priority, TicketCategory } from '@it-ops/shared';
import { useI18n } from '@/i18n/I18nContext';
import { useLabels } from '@/i18n/useLabels';

export interface TicketFormValues {
  title?: string;
  category: TicketCategory;
  description: string;
  reporterName: string;
  priority: Priority;
  expectedMode: 'ASAP' | 'SCHEDULED';
  expectedAt?: Dayjs;
  assignToMe?: boolean;
}

interface TicketIntakeFormProps {
  variant: 'public' | 'staff';
  submitting: boolean;
  error: string | null;
  onClearError: () => void;
  submitLabel: string;
  onSubmit: (values: TicketFormValues, files: File[]) => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const CATEGORY_ICONS: Record<TicketCategory, ReactNode> = {
  [TicketCategory.HARDWARE]: <LaptopOutlined />,
  [TicketCategory.SOFTWARE]: <AppstoreOutlined />,
  [TicketCategory.INTERNAL_SYSTEM]: <CloudServerOutlined />,
  [TicketCategory.ASSET_REQUEST]: <ShoppingCartOutlined />,
};

const PRIORITY_TONES: Record<Priority, string> = {
  [Priority.LOW]: '#8a95a0',
  [Priority.MEDIUM]: '#2563eb',
  [Priority.HIGH]: '#a9793c',
  [Priority.URGENT]: '#b05b49',
  [Priority.SUPER_URGENT]: '#a8435c',
};

export default function TicketIntakeForm({
  variant,
  submitting,
  error,
  onClearError,
  submitLabel,
  onSubmit,
}: TicketIntakeFormProps) {
  const [form] = Form.useForm<TicketFormValues>();
  const { t } = useI18n();
  const labels = useLabels();
  const { message } = AntdApp.useApp();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const expectedMode = Form.useWatch('expectedMode', form);

  const categoryOptions = Object.values(TicketCategory).map((value) => ({
    value,
    label: (
      <span className="category-option">
        <span className="category-option-icon">{CATEGORY_ICONS[value]}</span>
        {labels.category(value)}
      </span>
    ),
  }));

  const priorityOptions = Object.values(Priority).map((value) => ({
    value,
    label: (
      <span className="priority-option">
        <span className="priority-dot" style={{ background: PRIORITY_TONES[value] }} />
        {labels.priority(value)}
        {value === Priority.SUPER_URGENT && <FireFilled className="fire-icon" />}
      </span>
    ),
  }));

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!file.type.startsWith('image/')) {
      message.error(t('report.invalidImage'));
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_FILE_BYTES) {
      message.error(t('report.fileTooLarge'));
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleFinish = (values: TicketFormValues) => {
    const attachments: File[] = [];
    for (const file of files) {
      if (file.originFileObj) attachments.push(file.originFileObj);
    }
    onSubmit(values, attachments);
  };

  return (
    <section className="report-panel">
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          closable
          onClose={onClearError}
          className="form-alert"
        />
      )}

      <Form<TicketFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        className="intake-form"
        initialValues={{
          priority: Priority.MEDIUM,
          expectedMode: 'ASAP',
          ...(variant === 'staff' ? { assignToMe: true } : {}),
        }}
        onFinish={handleFinish}
      >
        {variant === 'staff' && (
          <Form.Item
            label={t('staffCreate.titleField')}
            name="title"
            extra={t('staffCreate.titleHint')}
          >
            <Input placeholder={t('staffCreate.titlePlaceholder')} maxLength={120} />
          </Form.Item>
        )}

        <Form.Item
          label={t('report.category')}
          name="category"
          rules={[{ required: true, message: t('report.requiredCategory') }]}
        >
          <Radio.Group optionType="button" options={categoryOptions} className="category-group" />
        </Form.Item>

        <Form.Item
          label={t('report.description')}
          name="description"
          rules={[
            { required: true, message: t('report.requiredDescription') },
            { min: 5, message: t('report.minDescription') },
          ]}
        >
          <Input.TextArea
            rows={7}
            maxLength={5000}
            showCount
            placeholder={t('report.descriptionPlaceholder')}
          />
        </Form.Item>

        <Form.Item label={t('report.screenshots')} extra={t('report.uploadHint')}>
          <Upload
            accept="image/png,image/jpeg,image/webp,image/gif"
            listType="picture-card"
            multiple
            maxCount={5}
            fileList={files}
            beforeUpload={beforeUpload}
            onChange={({ fileList: nextList }) => setFiles(nextList.slice(0, 5))}
          >
            {files.length >= 5 ? null : (
              <div className="upload-trigger">
                <PlusOutlined />
                <span>{t('report.upload')}</span>
              </div>
            )}
          </Upload>
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={13}>
            <Form.Item
              label={variant === 'staff' ? t('staffCreate.name') : t('report.name')}
              name="reporterName"
              rules={[{ required: true, message: t('report.requiredName') }]}
            >
              <Input
                placeholder={
                  variant === 'staff'
                    ? t('staffCreate.namePlaceholder')
                    : t('report.namePlaceholder')
                }
                maxLength={30}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={11}>
            <Form.Item label={t('report.priority')} name="priority">
              <Select options={priorityOptions} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label={t('report.expected')}>
          <div className="expected-control">
            <Form.Item name="expectedMode" noStyle>
              <Radio.Group
                optionType="button"
                options={[
                  {
                    value: 'ASAP',
                    label: (
                      <span className="expected-option">
                        <ThunderboltOutlined />
                        {t('report.asap')}
                      </span>
                    ),
                  },
                  {
                    value: 'SCHEDULED',
                    label: (
                      <span className="expected-option">
                        <CalendarOutlined />
                        {t('report.scheduled')}
                      </span>
                    ),
                  },
                ]}
                className="expected-group"
              />
            </Form.Item>

            {expectedMode === 'SCHEDULED' && (
              <Form.Item
                name="expectedAt"
                className="expected-date-item"
                rules={[{ required: true, message: t('report.requiredExpected') }]}
              >
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  placeholder={t('report.expectedPlaceholder')}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            )}
          </div>
        </Form.Item>

        {variant === 'staff' && (
          <Form.Item name="assignToMe" valuePropName="checked" extra={t('staffCreate.assignHint')}>
            <Checkbox>{t('staffCreate.assignToMe')}</Checkbox>
          </Form.Item>
        )}

        <div className="form-footer">
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            icon={<SendOutlined />}
            loading={submitting}
            className="report-submit"
          >
            {submitLabel}
          </Button>
        </div>
      </Form>
    </section>
  );
}

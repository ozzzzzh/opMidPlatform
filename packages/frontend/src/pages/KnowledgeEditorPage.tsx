import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App as AntdApp, Button, Checkbox, Col, Form, Input, Row, Select, Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CommentType,
  KnowledgeKind,
  KnowledgeSpace,
  KnowledgeStatus,
  TicketCategory,
  type KnowledgeStep,
} from '@it-ops/shared';
import { getErrorMessage } from '@/api/client';
import {
  createKnowledgeCard,
  fetchKnowledge,
  linkTicketKnowledge,
  updateKnowledgeCard,
} from '@/api/knowledge';
import { fetchTicket } from '@/api/tickets';
import { useI18n } from '@/i18n/I18nContext';
import { useLabels } from '@/i18n/useLabels';
import type { TranslationKey } from '@/i18n/messages';

interface EditorStep {
  title?: string;
  body: string;
}

interface EditorValues {
  title: string;
  space: KnowledgeSpace;
  system?: string;
  category?: TicketCategory;
  tags?: string[];
  keywords?: string[];
  summary?: string;
  symptom?: string;
  steps?: EditorStep[];
  escalation?: string;
  needsReview?: boolean;
}

const CATEGORY_SPACE: Record<TicketCategory, KnowledgeSpace> = {
  [TicketCategory.HARDWARE]: KnowledgeSpace.TERM,
  [TicketCategory.SOFTWARE]: KnowledgeSpace.OFFICE,
  [TicketCategory.INTERNAL_SYSTEM]: KnowledgeSpace.BIZ,
  [TicketCategory.ASSET_REQUEST]: KnowledgeSpace.ASSET,
};

function compactSteps(steps: EditorStep[] | undefined): KnowledgeStep[] {
  return (steps ?? [])
    .map((step) => ({
      ...(step.title?.trim() ? { title: step.title.trim() } : {}),
      body: step.body?.trim() ?? '',
    }))
    .filter((step) => step.body.length > 0);
}

export default function KnowledgeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('ticketId');
  const appendMode = searchParams.get('append') === '1';
  const isEditing = Boolean(id);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const labels = useLabels();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<EditorValues>();
  const [error, setError] = useState<string | null>(null);
  const [sourceTicketNo, setSourceTicketNo] = useState<string | null>(null);
  const prefilled = useRef(false);

  const articleQuery = useQuery({
    queryKey: ['knowledge-detail', id],
    queryFn: () => fetchKnowledge(id as string),
    enabled: isEditing,
  });

  const ticketQuery = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => fetchTicket(ticketId as string),
    enabled: Boolean(ticketId) && !prefilled.current,
    retry: 1,
  });

  useEffect(() => {
    if (prefilled.current || !articleQuery.data) return;
    const article = articleQuery.data;
    if (article.kind !== KnowledgeKind.CARD) {
      navigate(`/knowledge/${article.id}`, { replace: true });
      return;
    }
    form.setFieldsValue({
      title: article.title,
      space: article.space,
      system: article.system ?? undefined,
      category: article.category ?? undefined,
      tags: article.tags,
      keywords: article.keywords,
      summary: article.summary ?? undefined,
      symptom: article.symptom ?? undefined,
      steps: article.steps.map((step) => ({ title: step.title, body: step.body })),
      escalation: article.escalation ?? undefined,
      needsReview: article.needsReview,
    });
    setSourceTicketNo(article.sourceTicketNo);
    prefilled.current = true;
  }, [articleQuery.data, form, navigate]);

  useEffect(() => {
    if (!ticketQuery.data || articleQuery.data || prefilled.current) return;
    const ticket = ticketQuery.data;
    const staffNotes = ticket.comments
      .filter((comment) => comment.type !== CommentType.SYSTEM)
      .map((comment) => comment.content)
      .join('\n\n');
    const stepBody = ticket.resolution?.trim() || staffNotes.trim() || ticket.description.trim();

    form.setFieldsValue({
      title: ticket.title,
      space: CATEGORY_SPACE[ticket.category],
      category: ticket.category,
      system: undefined,
      tags: [labels.category(ticket.category)],
      keywords: [],
      summary: undefined,
      symptom: ticket.description,
      steps: [{ title: t('knowledge.editor.fromTicketStep'), body: stepBody }],
      escalation: undefined,
      needsReview: false,
    });
    setSourceTicketNo(ticket.ticketNo);
    prefilled.current = true;
  }, [articleQuery.data, form, labels, t, ticketQuery.data]);

  useEffect(() => {
    if (!appendMode || !ticketQuery.data || !articleQuery.data || !prefilled.current) return;
    const ticket = ticketQuery.data;
    const article = articleQuery.data;
    const staffNotes = ticket.comments
      .filter((comment) => comment.type !== CommentType.SYSTEM)
      .map((comment) => comment.content)
      .join('\n\n');
    const notes = ticket.resolution?.trim() || staffNotes.trim();
    if (!notes) return;

    const current = form.getFieldValue('steps') as EditorStep[] | undefined;
    const alreadyAdded = (current ?? []).some((step) => step.title === ticket.ticketNo);
    if (alreadyAdded) return;

    setSourceTicketNo(ticket.ticketNo);
    form.setFieldsValue({
      steps: [...(current ?? []), { title: ticket.ticketNo, body: notes }],
      needsReview: article.needsReview,
    });
  }, [appendMode, articleQuery.data, form, ticketQuery.data]);

  const mutation = useMutation({
    mutationFn: async (status: KnowledgeStatus) => {
      const values = await form.validateFields();
      const payload = {
        title: values.title,
        space: values.space,
        system: values.system?.trim() || undefined,
        category: values.category,
        tags: values.tags,
        keywords: values.keywords,
        summary: values.summary?.trim() || undefined,
        symptom: values.symptom?.trim() || undefined,
        steps: compactSteps(values.steps),
        escalation: values.escalation?.trim() || undefined,
        needsReview: values.needsReview ?? false,
        status,
        ...(!isEditing && ticketId ? { sourceTicketId: ticketId } : {}),
      };

      const article = isEditing
        ? await updateKnowledgeCard(id as string, payload)
        : await createKnowledgeCard(payload);

      if (isEditing && ticketId) {
        await linkTicketKnowledge(ticketId, article.id);
      }
      return article;
    },
    onSuccess: (article) => {
      message.success(
        article.status === KnowledgeStatus.PUBLISHED
          ? t('knowledge.editor.published')
          : t('knowledge.editor.saved'),
      );
      void queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      if (ticketId) {
        void queryClient.invalidateQueries({ queryKey: ['ticket-knowledge', ticketId] });
      }
      navigate(`/knowledge/${article.id}`, { replace: true });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const spaceOptions = Object.values(KnowledgeSpace).map((value) => ({
    value,
    label: t(`knowledge.space.${value}` as TranslationKey),
  }));

  const categoryOptions = Object.values(TicketCategory).map((value) => ({
    value,
    label: labels.category(value),
  }));

  if (isEditing && articleQuery.isLoading) {
    return (
      <div className="page-stack">
        <Spin />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-head">
        <div className="page-head-title">
          <span className="page-title-icon">
            <PlusOutlined />
          </span>
          <h1 className="page-title">
            {isEditing ? t('knowledge.editCardTitle') : t('knowledge.newCardTitle')}
          </h1>
        </div>

        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          {t('common.back')}
        </Button>
      </div>

      <section className="panel">
        {error && (
          <Alert
            type="error"
            showIcon
            closable
            message={error}
            onClose={() => setError(null)}
            className="form-alert"
          />
        )}

        {ticketId && (
          <Alert
            type="info"
            showIcon
            message={`${t('knowledge.editor.sourceTicket')}: ${sourceTicketNo ?? ticketId}`}
            description={t('knowledge.ticket.sinkIntro')}
            className="form-alert"
          />
        )}

        <Form<EditorValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{
            space: KnowledgeSpace.OFFICE,
            needsReview: false,
            steps: [{ body: '' }],
          }}
        >
          <Form.Item
            name="title"
            label={t('knowledge.editor.title')}
            rules={[{ required: true, message: t('knowledge.editor.titleRequired') }]}
          >
            <Input maxLength={200} placeholder={t('knowledge.editor.titlePlaceholder')} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="space"
                label={t('knowledge.editor.space')}
                rules={[{ required: true, message: t('knowledge.editor.spaceRequired') }]}
              >
                <Select options={spaceOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="system" label={t('knowledge.editor.system')}>
                <Input maxLength={100} placeholder={t('knowledge.editor.systemPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="category" label={t('knowledge.editor.category')}>
                <Select allowClear options={categoryOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="tags" label={t('knowledge.tags')}>
                <Select mode="tags" tokenSeparators={[',']} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="keywords" label={t('knowledge.keywords')}>
            <Select mode="tags" tokenSeparators={[',']} />
          </Form.Item>

          <Form.Item name="summary" label={t('knowledge.editor.summary')}>
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>

          <Form.Item name="symptom" label={t('knowledge.editor.symptom')}>
            <Input.TextArea
              rows={4}
              maxLength={5000}
              placeholder={t('knowledge.editor.symptomPlaceholder')}
            />
          </Form.Item>

          <Form.Item label={t('knowledge.editor.steps')} required>
            <Form.List name="steps">
              {(fields, { add, remove }) => (
                <div className="knowledge-step-editor">
                  {fields.map((field, index) => (
                    <div className="knowledge-step-editor-row" key={field.key}>
                      <div className="knowledge-step-editor-head">
                        <span>#{index + 1}</span>
                        {fields.length > 1 && (
                          <Button
                            type="text"
                            danger
                            size="small"
                            onClick={() => remove(field.name)}
                          >
                            {t('knowledge.editor.removeStep')}
                          </Button>
                        )}
                      </div>
                      <Form.Item name={[field.name, 'title']}>
                        <Input maxLength={120} placeholder={t('knowledge.editor.stepTitle')} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'body']}
                        rules={[{ required: true, message: t('knowledge.editor.requiredStep') }]}
                      >
                        <Input.TextArea
                          rows={3}
                          maxLength={5000}
                          placeholder={t('knowledge.editor.stepBody')}
                        />
                      </Form.Item>
                    </div>
                  ))}

                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => add({ body: '' })}
                  >
                    {t('knowledge.editor.addStep')}
                  </Button>
                </div>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item name="escalation" label={t('knowledge.editor.escalation')}>
            <Input.TextArea
              rows={3}
              maxLength={5000}
              placeholder={t('knowledge.editor.escalationPlaceholder')}
            />
          </Form.Item>

          <Form.Item name="needsReview" valuePropName="checked">
            <Checkbox>{t('knowledge.editor.needsReview')}</Checkbox>
          </Form.Item>

          <div className="form-footer knowledge-editor-footer">
            <span className="text-muted">{t('knowledge.editor.attachmentHint')}</span>
            <div className="knowledge-editor-actions">
              <Button onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
              <Button
                onClick={() => mutation.mutate(KnowledgeStatus.DRAFT)}
                loading={mutation.isPending}
              >
                {t('knowledge.editor.saveDraft')}
              </Button>
              <Button
                type="primary"
                onClick={() => mutation.mutate(KnowledgeStatus.PUBLISHED)}
                loading={mutation.isPending}
              >
                {t('knowledge.editor.publish')}
              </Button>
            </div>
          </div>
        </Form>
      </section>
    </div>
  );
}

import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App as AntdApp, Button, Col, Image, Row, Skeleton, Space, Tag, Upload } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  KnowledgeDocType,
  KnowledgeKind,
  KnowledgeStatus,
  Role,
  type KnowledgeArticleDetail,
} from '@it-ops/shared';
import { getErrorMessage } from '@/api/client';
import {
  archiveKnowledge,
  deleteKnowledge,
  deleteKnowledgeAttachment,
  downloadKnowledgeFile,
  fetchKnowledge,
  knowledgeAttachmentUrl,
  publishKnowledge,
  replaceKnowledgeDocumentFile,
  uploadKnowledgeAttachments,
} from '@/api/knowledge';
import { useAuth } from '@/auth/AuthContext';
import MarkdownView from '@/components/MarkdownView';
import { STATUS_TONES as TICKET_STATUS_TONES, toneClass, type Tone } from '@/components/tones';
import { useI18n } from '@/i18n/I18nContext';
import { useLabels } from '@/i18n/useLabels';
import type { TranslationKey } from '@/i18n/messages';

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_TONES: Record<KnowledgeStatus, Tone> = {
  [KnowledgeStatus.DRAFT]: 'warning',
  [KnowledgeStatus.PUBLISHED]: 'success',
  [KnowledgeStatus.ARCHIVED]: 'neutral',
};

function statusKey(status: KnowledgeStatus): TranslationKey {
  const suffix = `${status.charAt(0)}${status.slice(1).toLowerCase()}`;
  return `knowledge.status${suffix}` as TranslationKey;
}

export default function KnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const labels = useLabels();
  const { message, modal } = AntdApp.useApp();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);

  const articleQuery = useQuery({
    queryKey: ['knowledge-detail', id],
    queryFn: () => fetchKnowledge(id as string),
    enabled: Boolean(id),
  });

  const article = articleQuery.data;
  const isAdmin = user?.role === Role.ADMIN;
  const isDocument = article?.kind === KnowledgeKind.DOCUMENT;

  const refresh = (updated: KnowledgeArticleDetail) => {
    queryClient.setQueryData(['knowledge-detail', id], updated);
    void queryClient.invalidateQueries({ queryKey: ['knowledge'] });
  };

  const publishMutation = useMutation({
    mutationFn: () => publishKnowledge(id as string),
    onSuccess: (updated) => {
      refresh(updated);
      message.success(t('knowledge.detail.published'));
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveKnowledge(id as string),
    onSuccess: (updated) => {
      refresh(updated);
      message.success(t('knowledge.detail.archived'));
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteKnowledge(id as string),
    onSuccess: () => {
      message.success(t('knowledge.detail.deleted'));
      navigate('/knowledge', { replace: true });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const replaceMutation = useMutation({
    mutationFn: (file: File) => replaceKnowledgeDocumentFile(id as string, file),
    onSuccess: (updated) => {
      refresh(updated);
      message.success(t('knowledge.uploadSuccess'));
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const uploadImagesMutation = useMutation({
    mutationFn: (file: File) => uploadKnowledgeAttachments(id as string, [file]),
    onSuccess: (updated) => {
      refresh(updated);
      message.success(t('knowledge.detail.uploadSuccess'));
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteKnowledgeAttachment(attachmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['knowledge-detail', id] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setPreviewUrl(null);
    setPreviewText(null);

    if (article?.kind === KnowledgeKind.DOCUMENT && article.file) {
      const mime = article.file.mimeType ?? '';
      if (mime === 'application/pdf' || mime === 'text/markdown' || mime === 'text/plain') {
        downloadKnowledgeFile(article.id)
          .then(async (blob) => {
            if (cancelled) return;
            if (mime === 'text/markdown' || mime === 'text/plain') {
              setPreviewText(await blob.text());
            } else {
              objectUrl = URL.createObjectURL(blob);
              setPreviewUrl(objectUrl);
            }
          })
          .catch(() => undefined);
      }
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [article?.id, article?.kind, article?.file, article?.file?.mimeType]);

  if (articleQuery.isLoading) {
    return (
      <div className="page-stack">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  if (articleQuery.isError || !article) {
    return (
      <Alert
        type="error"
        showIcon
        message={t('knowledge.loadError')}
        description={getErrorMessage(articleQuery.error)}
        action={
          <Button onClick={() => navigate('/knowledge')}>{t('knowledge.detail.back')}</Button>
        }
      />
    );
  }

  const handleDownload = async () => {
    try {
      const blob = await downloadKnowledgeFile(article.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = article.file?.filename ?? 'document';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const confirmDelete = () => {
    modal.confirm({
      title: t('knowledge.detail.deleteConfirm'),
      content: t('knowledge.detail.deleteContent'),
      okText: t('knowledge.detail.delete'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(),
    });
  };

  const confirmDeleteImage = (attachmentId: string) => {
    modal.confirm({
      title: t('knowledge.detail.removeImageConfirm'),
      okText: t('knowledge.detail.removeImage'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => deleteImageMutation.mutateAsync(attachmentId),
    });
  };

  return (
    <div className="page-stack">
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        className="back-link"
        onClick={() => navigate('/knowledge')}
      >
        {t('knowledge.detail.back')}
      </Button>

      <div className="detail-head">
        <div className="detail-head-main">
          <div className="detail-kicker">
            <span className="ticket-no">{article.code}</span>
            <Tag className={toneClass(isDocument ? 'violet' : 'primary')} bordered={false}>
              {isDocument
                ? article.docType === KnowledgeDocType.REFERENCE
                  ? t('knowledge.docReference')
                  : t('knowledge.docHandbook')
                : t('knowledge.kindCard')}
            </Tag>
            <Tag className={toneClass(STATUS_TONES[article.status])} bordered={false}>
              {t(statusKey(article.status))}
            </Tag>
            {article.needsReview && (
              <Tag className={toneClass('warning')} bordered={false}>
                {t('knowledge.needsReview')}
              </Tag>
            )}
          </div>
          <h1 className="page-title">{article.title}</h1>
          <div className="knowledge-code-line">{article.summary}</div>
        </div>

        <Space wrap>
          {!isDocument && (
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/knowledge/${article.id}/edit`)}
            >
              {t('knowledge.detail.edit')}
            </Button>
          )}
          {article.status === KnowledgeStatus.DRAFT && !isDocument && (
            <Button
              type="primary"
              onClick={() => publishMutation.mutate()}
              loading={publishMutation.isPending}
            >
              {t('knowledge.detail.publish')}
            </Button>
          )}
          {isDocument && (
            <>
              <Button icon={<DownloadOutlined />} onClick={() => void handleDownload()}>
                {t('knowledge.detail.download')}
              </Button>
              <Upload
                showUploadList={false}
                maxCount={1}
                accept=".pdf,.docx,.xlsx,.md,.txt"
                beforeUpload={(file) => {
                  replaceMutation.mutate(file);
                  return Upload.LIST_IGNORE;
                }}
              >
                <Button icon={<UploadOutlined />}>{t('knowledge.detail.replaceFile')}</Button>
              </Upload>
            </>
          )}
          {article.status === KnowledgeStatus.PUBLISHED && (
            <Button onClick={() => archiveMutation.mutate()} loading={archiveMutation.isPending}>
              {t('knowledge.detail.archive')}
            </Button>
          )}
          {isAdmin && (
            <Button danger icon={<DeleteOutlined />} onClick={confirmDelete}>
              {t('knowledge.detail.delete')}
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          {isDocument ? (
            <>
              <section className="panel detail-section">
                <h2>
                  <FileTextOutlined />
                  {t('knowledge.detail.document')}
                </h2>
                <dl className="meta-list knowledge-file-meta">
                  <div>
                    <dt>{t('knowledge.detail.fileName')}</dt>
                    <dd>{article.file?.filename ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>{t('knowledge.detail.fileSize')}</dt>
                    <dd>{article.file ? formatBytes(article.file.size) : '—'}</dd>
                  </div>
                </dl>
              </section>

              <section className="panel detail-section">
                <h2>
                  <FileTextOutlined />
                  {t('knowledge.detail.preview')}
                </h2>
                {previewUrl ? (
                  <iframe
                    title={article.title}
                    src={previewUrl}
                    className="knowledge-preview-frame"
                  />
                ) : previewText !== null ? (
                  <div className="markdown-preview">
                    <MarkdownView content={previewText} />
                  </div>
                ) : (
                  <div className="empty-block">{t('knowledge.detail.noPreview')}</div>
                )}
              </section>
            </>
          ) : (
            <>
              {article.symptom && (
                <section className="panel detail-section">
                  <h2>
                    <InfoCircleOutlined />
                    {t('knowledge.detail.symptom')}
                  </h2>
                  <div className="long-text">{article.symptom}</div>
                </section>
              )}

              <section className="panel detail-section">
                <h2>
                  <CheckCircleOutlined />
                  {t('knowledge.detail.steps')}
                </h2>
                {article.steps.length === 0 ? (
                  <div className="empty-block">{t('knowledge.detail.noSteps')}</div>
                ) : (
                  <ol className="knowledge-steps">
                    {article.steps.map((step, index) => (
                      <li key={`${index}-${step.title ?? 'step'}`}>
                        <div className="knowledge-step-head">
                          <span className="knowledge-step-index">{index + 1}</span>
                          {step.title && <strong>{step.title}</strong>}
                        </div>
                        <div className="knowledge-step-body">{step.body}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {article.escalation && (
                <section className="panel detail-section">
                  <h2>
                    <InfoCircleOutlined />
                    {t('knowledge.detail.escalation')}
                  </h2>
                  <div className="long-text">{article.escalation}</div>
                </section>
              )}

              <section className="panel detail-section">
                <h2>
                  <PictureOutlined />
                  {t('knowledge.detail.attachments')}
                </h2>
                {article.attachments.length === 0 ? (
                  <div className="empty-block">{t('knowledge.detail.noAttachments')}</div>
                ) : (
                  <Image.PreviewGroup>
                    <div className="attachment-grid">
                      {article.attachments.map((attachment) => (
                        <div className="knowledge-attachment-item" key={attachment.id}>
                          <div className="attachment-thumb">
                            <Image
                              src={knowledgeAttachmentUrl(attachment.id)}
                              alt={attachment.caption ?? attachment.filename}
                              width={120}
                              height={90}
                            />
                          </div>
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            className="knowledge-attachment-remove"
                            onClick={() => confirmDeleteImage(attachment.id)}
                            aria-label={t('knowledge.detail.removeImage')}
                          />
                        </div>
                      ))}
                    </div>
                  </Image.PreviewGroup>
                )}

                <div className="knowledge-upload-row">
                  <Upload
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    showUploadList={false}
                    beforeUpload={(file) => {
                      if (!file.type.startsWith('image/')) {
                        message.error(t('knowledge.detail.invalidImage'));
                        return Upload.LIST_IGNORE;
                      }
                      if (file.size > 10 * 1024 * 1024) {
                        message.error(t('knowledge.detail.fileTooLarge'));
                        return Upload.LIST_IGNORE;
                      }
                      uploadImagesMutation.mutate(file);
                      return Upload.LIST_IGNORE;
                    }}
                  >
                    <Button icon={<UploadOutlined />} loading={uploadImagesMutation.isPending}>
                      {t('knowledge.detail.uploadImages')}
                    </Button>
                  </Upload>
                  <span className="text-muted knowledge-upload-hint">
                    {t('knowledge.detail.uploadImageHint')}
                  </span>
                </div>
              </section>
            </>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <section className="panel detail-section">
            <h2>
              <InfoCircleOutlined />
              {t('knowledge.detail.meta')}
            </h2>
            <dl className="meta-list">
              <div>
                <dt>{t('knowledge.detail.status')}</dt>
                <dd>{t(statusKey(article.status))}</dd>
              </div>
              <div>
                <dt>{t('knowledge.detail.space')}</dt>
                <dd>{t(`knowledge.space.${article.space}` as TranslationKey)}</dd>
              </div>
              <div>
                <dt>{t('knowledge.detail.system')}</dt>
                <dd>{article.system ?? '—'}</dd>
              </div>
              <div>
                <dt>{t('knowledge.detail.owner')}</dt>
                <dd>{article.owner?.displayName ?? '—'}</dd>
              </div>
              <div>
                <dt>{t('knowledge.detail.version')}</dt>
                <dd>v{article.version}</dd>
              </div>
              <div>
                <dt>{t('knowledge.detail.updated')}</dt>
                <dd>{dayjs(article.updatedAt).format('YYYY-MM-DD HH:mm')}</dd>
              </div>
              {article.publishedAt && (
                <div>
                  <dt>{t('knowledge.detail.publishedAt')}</dt>
                  <dd>{dayjs(article.publishedAt).format('YYYY-MM-DD HH:mm')}</dd>
                </div>
              )}
              {article.lastVerifiedAt && (
                <div>
                  <dt>{t('knowledge.detail.lastVerified')}</dt>
                  <dd>{dayjs(article.lastVerifiedAt).format('YYYY-MM-DD')}</dd>
                </div>
              )}
              {article.sourceTicketId && (
                <div>
                  <dt>{t('knowledge.detail.sourceTicket')}</dt>
                  <dd>
                    <Button
                      type="link"
                      className="inline-link"
                      onClick={() => navigate(`/tickets/${article.sourceTicketId}`)}
                    >
                      {article.sourceTicketNo ?? article.sourceTicketId}
                    </Button>
                  </dd>
                </div>
              )}
            </dl>

            {article.tags.length > 0 && (
              <div className="knowledge-tag-block">
                <span>{t('knowledge.detail.tags')}</span>
                <Space size={[6, 6]} wrap>
                  {article.tags.map((tag) => (
                    <Tag key={tag} bordered={false} className={toneClass('neutral')}>
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {article.keywords.length > 0 && (
              <div className="knowledge-tag-block">
                <span>{t('knowledge.detail.keywords')}</span>
                <Space size={[6, 6]} wrap>
                  {article.keywords.map((keyword) => (
                    <Tag key={keyword} bordered={false} className={toneClass('primary')}>
                      {keyword}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </section>

          <section className="panel detail-section">
            <h2>
              <FileTextOutlined />
              {t('knowledge.detail.linkedTickets')}
              <span className="knowledge-section-count">{article.linkedTickets.length}</span>
            </h2>

            {article.linkedTickets.length === 0 ? (
              <div className="empty-block">{t('knowledge.detail.noLinkedTickets')}</div>
            ) : (
              <div className="knowledge-ticket-list">
                {article.linkedTickets.map((item) => (
                  <Link to={`/tickets/${item.id}`} className="knowledge-ticket-item" key={item.id}>
                    <div className="knowledge-ticket-main">
                      <span className="knowledge-ticket-no">
                        {item.ticketNo}
                        {item.source === 'AUTO' && (
                          <Tag className={toneClass('neutral')} bordered={false}>
                            {t('knowledge.detail.sourceTicketTag')}
                          </Tag>
                        )}
                      </span>
                      <span className="knowledge-ticket-title">{item.title}</span>
                      <span className="knowledge-ticket-meta">
                        {item.reporterName ?? t('common.anonymous')} ·{' '}
                        {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                      </span>
                    </div>
                    <Tag className={toneClass(TICKET_STATUS_TONES[item.status])} bordered={false}>
                      {labels.status(item.status)}
                    </Tag>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </Col>
      </Row>
    </div>
  );
}

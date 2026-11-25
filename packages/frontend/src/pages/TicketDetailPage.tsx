import {
  ArrowLeftOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ContactsOutlined,
  CopyOutlined,
  FileAddOutlined,
  FileTextOutlined,
  FireFilled,
  InfoCircleOutlined,
  LoadingOutlined,
  MessageOutlined,
  PhoneOutlined,
  PictureOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntdApp,
  Button,
  Col,
  Form,
  Image,
  Input,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Upload,
  type UploadProps,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CommentType, Priority, TicketStatus, type TicketDetail } from '@it-ops/shared';
import { getErrorMessage } from '@/api/client';
import { fetchTicketKnowledge, linkTicketKnowledge, unlinkTicketKnowledge } from '@/api/knowledge';
import {
  fetchContacts,
  fetchTicketContacts,
  linkTicketContact,
  unlinkTicketContact,
} from '@/api/contacts';
import { PRIORITY_TONES, STATUS_TONES, toneClass } from '@/components/tones';
import { useI18n } from '@/i18n/I18nContext';
import { useLabels } from '@/i18n/useLabels';
import {
  addTicketComment,
  attachmentUrl,
  claimTicket,
  closeTicket,
  fetchTicket,
  resolveTicket,
  uploadTicketAttachments,
} from '@/api/tickets';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface ResolveValues {
  resolution: string;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const labels = useLabels();
  const { message, modal } = AntdApp.useApp();
  const [resolveForm] = Form.useForm<ResolveValues>();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  const ticketQuery = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id as string),
    enabled: Boolean(id),
    retry: 1,
  });

  const knowledgeQuery = useQuery({
    queryKey: ['ticket-knowledge', id],
    queryFn: () => fetchTicketKnowledge(id as string),
    enabled: Boolean(id),
    retry: 1,
    staleTime: 30_000,
  });

  const ticketContactsQuery = useQuery({
    queryKey: ['ticket-contacts', id],
    queryFn: () => fetchTicketContacts(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });

  const contactSearchQuery = useQuery({
    queryKey: ['contact-search', contactSearch],
    queryFn: () => fetchContacts({ q: contactSearch }),
    enabled: Boolean(id) && contactSearch.trim().length >= 1,
    staleTime: 30_000,
  });

  const linkContactMutation = useMutation({
    mutationFn: (contactId: string) => linkTicketContact(id as string, contactId),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket-contacts', id], data);
      setContactSearch('');
      void queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      message.success(t('ticketContacts.linkSuccess'));
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const unlinkContactMutation = useMutation({
    mutationFn: (contactId: string) => unlinkTicketContact(id as string, contactId),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket-contacts', id], data);
      void queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      message.success(t('ticketContacts.unlinkSuccess'));
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const copyContactValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(t('common.copySuccess'));
    } catch {
      message.error(t('common.copyFailed'));
    }
  };

  const linkKnowledgeMutation = useMutation({
    mutationFn: (articleId: string) => linkTicketKnowledge(id as string, articleId),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket-knowledge', id], data);
      void queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      message.success(t('knowledge.ticket.linkedSuccess'));
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const unlinkKnowledgeMutation = useMutation({
    mutationFn: (articleId: string) => unlinkTicketKnowledge(id as string, articleId),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket-knowledge', id], data);
      void queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      message.success(t('knowledge.ticket.unlinkedSuccess'));
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const syncTicket = (ticket: TicketDetail) => {
    queryClient.setQueryData(['ticket', id], ticket);
    void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
  };

  const claimMutation = useMutation({
    mutationFn: () => claimTicket(id as string),
    onSuccess: (ticket) => {
      syncTicket(ticket);
      message.success(t('detail.claimed'));
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const resolveMutation = useMutation({
    mutationFn: (resolution: string) => resolveTicket(id as string, resolution),
    onSuccess: (ticket) => {
      syncTicket(ticket);
      setResolveOpen(false);
      resolveForm.resetFields();
      message.success(t('detail.resolved'));
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeTicket(id as string),
    onSuccess: (ticket) => {
      syncTicket(ticket);
      message.success(t('detail.closed'));
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => addTicketComment(id as string, content),
    onSuccess: () => {
      setCommentText('');
      void queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadTicketAttachments(id as string, [file]),
  });

  const handleUpload: UploadProps['beforeUpload'] = async (file) => {
    if (!file.type.startsWith('image/')) {
      message.error(t('report.invalidImage'));
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_FILE_BYTES) {
      message.error(t('report.fileTooLarge'));
      return Upload.LIST_IGNORE;
    }

    try {
      const updated = await uploadMutation.mutateAsync(file);
      queryClient.setQueryData(['ticket', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      message.success(t('detail.uploadSuccess'));
    } catch (error) {
      message.error(getErrorMessage(error));
    }

    return Upload.LIST_IGNORE;
  };

  if (ticketQuery.isLoading) {
    return (
      <div className="page-stack">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (ticketQuery.isError || !ticketQuery.data) {
    return (
      <Alert
        type="error"
        showIcon
        message={t('detail.loadError')}
        description={getErrorMessage(ticketQuery.error)}
        action={<Button onClick={() => navigate('/tickets')}>{t('detail.backToList')}</Button>}
      />
    );
  }

  const ticket = ticketQuery.data;
  const isClosed = ticket.status === TicketStatus.CLOSED;

  const confirmClose = () => {
    modal.confirm({
      title: t('detail.closeTitle'),
      content: t('detail.closeContent'),
      okText: t('detail.closeTicket'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => closeMutation.mutateAsync(),
    });
  };

  return (
    <div className="page-stack">
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        className="back-link"
        onClick={() => navigate('/tickets')}
      >
        {t('detail.back')}
      </Button>

      <div className="detail-head">
        <div className="detail-head-main">
          <div className="detail-kicker">
            <span className="ticket-no">{ticket.ticketNo}</span>
            <Tag className={toneClass(STATUS_TONES[ticket.status])} bordered={false}>
              {labels.status(ticket.status)}
            </Tag>
            {ticket.priority === Priority.SUPER_URGENT && (
              <span className="super-urgent-marker">
                <FireFilled className="fire-icon" />
                {labels.priority(Priority.SUPER_URGENT)}
              </span>
            )}
          </div>
          <h1 className="page-title">{ticket.title}</h1>
        </div>

        <Space wrap>
          {ticket.status === TicketStatus.OPEN && (
            <Button
              type="primary"
              onClick={() => claimMutation.mutate()}
              loading={claimMutation.isPending}
            >
              {t('detail.claim')}
            </Button>
          )}
          {ticket.status === TicketStatus.CLAIMED && (
            <>
              <Button type="primary" onClick={() => setResolveOpen(true)}>
                {t('detail.resolve')}
              </Button>
              <Button danger onClick={confirmClose} loading={closeMutation.isPending}>
                {t('detail.close')}
              </Button>
            </>
          )}
          {ticket.status === TicketStatus.RESOLVED && (
            <Button type="primary" onClick={confirmClose} loading={closeMutation.isPending}>
              {t('detail.closeTicket')}
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <section className="panel detail-section">
            <h2>
              <FileTextOutlined />
              {t('detail.description')}
            </h2>
            <div className="long-text">{ticket.description}</div>
          </section>

          <section className="panel detail-section">
            <h2>
              <PictureOutlined />
              {t('detail.screenshots')}
            </h2>

            {ticket.attachments.length > 0 && (
              <Image.PreviewGroup>
                <div className="attachment-grid">
                  {ticket.attachments.map((attachment) => (
                    <div className="attachment-thumb" key={attachment.id}>
                      <Image
                        src={attachmentUrl(attachment.id)}
                        alt={attachment.filename}
                        width={120}
                        height={90}
                      />
                    </div>
                  ))}
                </div>
              </Image.PreviewGroup>
            )}

            <div className="attachment-upload">
              <Upload
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                showUploadList={false}
                disabled={uploadMutation.isPending}
                beforeUpload={handleUpload}
              >
                <div className="attachment-add">
                  {uploadMutation.isPending ? <LoadingOutlined /> : <PlusOutlined />}
                  <span>{t('detail.uploadImage')}</span>
                </div>
              </Upload>
              <span className="attachment-hint">{t('detail.uploadHint')}</span>
            </div>
          </section>

          {ticket.resolution && (
            <section className="panel detail-section">
              <h2>
                <CheckCircleOutlined />
                {t('detail.resolution')}
              </h2>
              <div className="long-text">{ticket.resolution}</div>
            </section>
          )}

          <section className="panel detail-section">
            <h2>
              <MessageOutlined />
              {t('detail.records')}
            </h2>

            {ticket.comments.length === 0 ? (
              <div className="empty-block">{t('detail.noRecords')}</div>
            ) : (
              <div className="timeline">
                {ticket.comments.map((comment) => (
                  <div className="timeline-item" key={comment.id}>
                    <div className="timeline-head">
                      <strong>
                        {comment.type === CommentType.SYSTEM
                          ? t('common.systemRecord')
                          : comment.author.displayName}
                      </strong>
                      <time>{dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm')}</time>
                    </div>
                    <div className="timeline-content">{comment.content}</div>
                  </div>
                ))}
              </div>
            )}

            {!isClosed && (
              <div className="comment-box">
                <Input.TextArea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder={t('detail.commentPlaceholder')}
                />
                <div className="comment-actions">
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    disabled={!commentText.trim()}
                    loading={commentMutation.isPending}
                    onClick={() => commentMutation.mutate(commentText.trim())}
                  >
                    {t('detail.submitComment')}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </Col>

        <Col xs={24} lg={8}>
          <section className="panel detail-section">
            <h2>
              <InfoCircleOutlined />
              {t('detail.info')}
            </h2>
            <dl className="meta-list">
              <div>
                <dt>{t('detail.category')}</dt>
                <dd>{labels.category(ticket.category)}</dd>
              </div>
              <div>
                <dt>{t('detail.priority')}</dt>
                <dd>
                  <Tag
                    bordered={false}
                    className={[
                      toneClass(PRIORITY_TONES[ticket.priority]),
                      ticket.priority === Priority.SUPER_URGENT ? 'super-urgent-tag' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    icon={
                      ticket.priority === Priority.SUPER_URGENT ? (
                        <FireFilled className="fire-icon" />
                      ) : undefined
                    }
                  >
                    {labels.priority(ticket.priority)}
                  </Tag>
                </dd>
              </div>
              <div>
                <dt>{t('detail.status')}</dt>
                <dd>{labels.status(ticket.status)}</dd>
              </div>
              <div>
                <dt>{t('detail.source')}</dt>
                <dd>{labels.source(ticket.source)}</dd>
              </div>
              <div>
                <dt>{t('detail.name')}</dt>
                <dd>
                  {ticket.submitter?.displayName ?? ticket.reporterName ?? t('common.anonymous')}
                </dd>
              </div>
              <div>
                <dt>{t('detail.assignee')}</dt>
                <dd>{ticket.assignee?.displayName ?? t('detail.unassigned')}</dd>
              </div>
              <div>
                <dt>{t('detail.createdAt')}</dt>
                <dd>{dayjs(ticket.createdAt).format('YYYY-MM-DD HH:mm')}</dd>
              </div>
              <div>
                <dt>{t('detail.expectedAt')}</dt>
                <dd>
                  {ticket.expectedAt
                    ? dayjs(ticket.expectedAt).format('YYYY-MM-DD HH:mm')
                    : t('report.asap')}
                </dd>
              </div>
              {ticket.claimedAt && (
                <div>
                  <dt>{t('detail.claimedAt')}</dt>
                  <dd>{dayjs(ticket.claimedAt).format('YYYY-MM-DD HH:mm')}</dd>
                </div>
              )}
              {ticket.resolvedAt && (
                <div>
                  <dt>{t('detail.resolvedAt')}</dt>
                  <dd>{dayjs(ticket.resolvedAt).format('YYYY-MM-DD HH:mm')}</dd>
                </div>
              )}
              {ticket.closedAt && (
                <div>
                  <dt>{t('detail.closedAt')}</dt>
                  <dd>{dayjs(ticket.closedAt).format('YYYY-MM-DD HH:mm')}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="panel detail-section knowledge-ticket-panel">
            <div className="knowledge-panel-head">
              <h2>
                <ContactsOutlined />
                {t('ticketContacts.title')}
              </h2>
            </div>

            <Select<string>
              showSearch
              allowClear
              placeholder={t('ticketContacts.searchPlaceholder')}
              filterOption={false}
              onSearch={setContactSearch}
              onSelect={(contactId) => linkContactMutation.mutate(contactId)}
              options={(contactSearchQuery.data?.items ?? [])
                .filter(
                  (contact) =>
                    !ticketContactsQuery.data?.linked.some((linked) => linked.id === contact.id),
                )
                .slice(0, 10)
                .map((contact) => ({
                  value: contact.id,
                  label: `${contact.name} · ${contact.systemName} · ${contact.role}`,
                }))}
              className="ticket-contact-search"
              notFoundContent={
                contactSearch ? t('ticketContacts.noResults') : t('ticketContacts.searchHint')
              }
            />

            {ticketContactsQuery.data?.linked.length ? (
              <div className="ticket-contact-list">
                {ticketContactsQuery.data.linked.map((contact) => (
                  <div className="ticket-contact-item" key={contact.id}>
                    <div className="ticket-contact-main">
                      <strong>{contact.name}</strong>
                      <span className="ticket-contact-role">{contact.role}</span>
                      <span className="ticket-contact-system">{contact.systemName}</span>
                      <div className="ticket-contact-meta">
                        {contact.mobile && (
                          <span className="contact-phone">
                            <PhoneOutlined />
                            <a href={`tel:${contact.mobile.replace(/[^d+]/g, '')}`}>
                              {contact.mobile}
                            </a>
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => void copyContactValue(contact.mobile as string)}
                            />
                          </span>
                        )}
                        {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
                      </div>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => unlinkContactMutation.mutate(contact.id)}
                    >
                      {t('ticketContacts.unlink')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-block">{t('ticketContacts.noLinked')}</div>
            )}
          </section>

          <section className="panel detail-section knowledge-ticket-panel">
            <div className="knowledge-panel-head">
              <h2>
                <BookOutlined />
                {t('knowledge.ticket.title')}
              </h2>
              {(ticket.status === TicketStatus.RESOLVED ||
                ticket.status === TicketStatus.CLOSED) && (
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<FileAddOutlined />}
                  onClick={() => navigate(`/knowledge/new?ticketId=${ticket.id}`)}
                >
                  {t('knowledge.ticket.deposit')}
                </Button>
              )}
            </div>

            {knowledgeQuery.isError && (
              <div className="empty-block">{t('knowledge.ticket.loadError')}</div>
            )}

            {knowledgeQuery.data && knowledgeQuery.data.linked.length > 0 && (
              <div className="knowledge-mini-list">
                <div className="knowledge-mini-label">{t('knowledge.ticket.linked')}</div>
                {knowledgeQuery.data.linked.map((item) => (
                  <div className="knowledge-mini-item" key={item.id}>
                    <div className="knowledge-mini-main">
                      <Link to={`/knowledge/${item.id}`} className="knowledge-mini-code">
                        {item.code}
                      </Link>
                      <span className="knowledge-mini-title">{item.title}</span>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => unlinkKnowledgeMutation.mutate(item.id)}
                    >
                      {t('knowledge.ticket.unlink')}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {knowledgeQuery.data && knowledgeQuery.data.suggestions.length > 0 && (
              <div className="knowledge-mini-list">
                <div className="knowledge-mini-label">{t('knowledge.ticket.suggestions')}</div>
                {knowledgeQuery.data.suggestions.slice(0, 4).map((item) => (
                  <div className="knowledge-mini-item" key={item.id}>
                    <div className="knowledge-mini-main">
                      <Link to={`/knowledge/${item.id}`} className="knowledge-mini-code">
                        {item.code}
                      </Link>
                      <span className="knowledge-mini-title">{item.title}</span>
                    </div>
                    <div className="knowledge-mini-actions">
                      <Button
                        type="link"
                        size="small"
                        onClick={() => linkKnowledgeMutation.mutate(item.id)}
                      >
                        {t('knowledge.ticket.link')}
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        onClick={() =>
                          navigate(`/knowledge/${item.id}/edit?ticketId=${ticket.id}&append=1`)
                        }
                      >
                        {t('knowledge.ticket.append')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {knowledgeQuery.data &&
              knowledgeQuery.data.linked.length === 0 &&
              knowledgeQuery.data.suggestions.length === 0 && (
                <div className="empty-block">{t('knowledge.ticket.noLinked')}</div>
              )}
          </section>
        </Col>
      </Row>

      <Modal
        title={t('detail.resolveTitle')}
        open={resolveOpen}
        onCancel={() => {
          setResolveOpen(false);
          resolveForm.resetFields();
        }}
        onOk={() => resolveForm.submit()}
        okText={t('detail.confirmResolve')}
        cancelText={t('common.cancel')}
        confirmLoading={resolveMutation.isPending}
        destroyOnClose
      >
        <Form<ResolveValues>
          form={resolveForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => resolveMutation.mutate(values.resolution)}
        >
          <Form.Item
            label={t('detail.resolveLabel')}
            name="resolution"
            rules={[{ required: true, message: t('detail.resolveRequired') }]}
          >
            <Input.TextArea
              rows={5}
              maxLength={5000}
              placeholder={t('detail.resolvePlaceholder')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

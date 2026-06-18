import { Card, Table, Button, Tag, App, Space, Empty } from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { documentosApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toItems } from '@/utils';
import type { Documento } from '@/types';

function fmtTamanho(bytes?: number): string {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: ['documentos'],
    queryFn: () => documentosApi.list(),
  });

  const excluirMut = useMutation({
    mutationFn: (id: string) => documentosApi.excluir(id),
    onSuccess: () => {
      message.success('Documento excluído.');
      void qc.invalidateQueries({ queryKey: ['documentos'] });
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  async function baixar(id: string) {
    try {
      const { url } = await documentosApi.accessUrl(id);
      if (url) window.open(url, '_blank');
      else message.warning('URL de acesso indisponível.');
    } catch (e) {
      message.error(apiErrorMessage(e));
    }
  }

  const docs = toItems<Documento>(listQ.data as never);

  return (
    <>
      <PageHeader
        title="Documentos"
        subtitle="Arquivos clínicos e administrativos (armazenamento seguro S3/R2)"
      />

      <Card variant="borderless">
        <Table<Documento>
          rowKey="id"
          loading={listQ.isLoading}
          dataSource={docs}
          locale={{ emptyText: <Empty description="Nenhum documento" /> }}
          columns={[
            {
              title: 'Documento',
              dataIndex: 'nome',
              render: (v, r) => (
                <Space>
                  <FileOutlined style={{ color: '#0d6e9e' }} />
                  {v ?? r.titulo ?? r.id}
                </Space>
              ),
            },
            { title: 'Tipo', dataIndex: 'tipo', render: (v) => v || '—' },
            { title: 'Tamanho', dataIndex: 'tamanho', render: fmtTamanho, width: 120 },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 130,
              render: (v) => (v ? <Tag>{v}</Tag> : '—'),
            },
            {
              title: 'Enviado em',
              dataIndex: 'criadoEm',
              render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
              width: 130,
            },
            {
              title: '',
              width: 110,
              render: (_, r) => (
                <Space>
                  <Button
                    type="text"
                    icon={<DownloadOutlined />}
                    onClick={() => baixar(r.id)}
                    title="Baixar"
                  />
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => excluirMut.mutate(r.id)}
                    title="Excluir"
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}

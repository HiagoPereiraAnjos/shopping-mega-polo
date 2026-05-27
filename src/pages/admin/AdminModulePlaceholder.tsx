import React from 'react';
import { Settings2 } from 'lucide-react';
import { SEO } from '../../components/ui/SEO';
import AdminCard from '../../components/admin/AdminCard';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

interface AdminModulePlaceholderProps {
  title: string;
  description: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function AdminModulePlaceholder({
  title,
  description,
  emptyTitle = 'Módulo em preparação',
  emptyDescription = 'A estrutura deste módulo já está pronta para receber os CRUDs na próxima etapa.',
}: AdminModulePlaceholderProps) {
  return (
    <>
      <SEO title={`${title} | CMS Mega Polo Moda`} description={description} />

      <AdminPageHeader title={title} description={description} />

      <AdminCard>
        <AdminEmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={Settings2}
          action={
            <p className="text-xs text-brand-dark/60">
              Use este espaço para evoluir o conteúdo administrativo sem impactar o site público.
            </p>
          }
        />
      </AdminCard>
    </>
  );
}

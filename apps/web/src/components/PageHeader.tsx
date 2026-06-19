import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  extra?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, subtitle, extra, className }: PageHeaderProps) {
  const desc = description ?? subtitle;
  return (
    <div className={cn('flex items-start justify-between mb-8', className)}>
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {extra && <div className="flex items-center gap-3">{extra}</div>}
    </div>
  );
}

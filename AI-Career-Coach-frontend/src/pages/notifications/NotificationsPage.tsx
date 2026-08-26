import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '../../api/endpoints';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';
import { IMAGES } from '../../config/images';

export default function NotificationsPage() {
  const client = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.list().then((response) => response.data),
  });

  const markRead = async (id: number) => {
    await notificationsAPI.markRead(id);
    await client.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <PageWrapper title="Notifications & Activity Log" subtitle="Assessment results, ATS insights, and application updates.">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Summary Bar */}
        {data?.notifications.length ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Card padding="sm" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Bell size={16} className="text-indigo-400" />
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {data.notifications.filter((n: { is_read: boolean }) => !n.is_read).length} unread notification{data.notifications.filter((n: { is_read: boolean }) => !n.is_read).length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {data.notifications.length} total
              </span>
            </Card>
          </motion.div>
        ) : null}

        {/* Notification List */}
        <Card padding="none" className="overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 items-start">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
                <Bell size={20} className="text-rose-400" />
              </div>
              <p className="text-sm font-medium text-rose-400">Unable to load notifications.</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Please try again later.</p>
            </div>
          ) : data?.notifications.length ? (
            <div className="divide-y divide-[var(--border-subtle)]">
              {data.notifications.map((item: { id: number; title: string; message: string; is_read: boolean; created_at: string }, index: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  className={`flex gap-4 p-5 transition-colors duration-200 ${
                    item.is_read
                      ? 'bg-transparent hover:bg-white/[0.02]'
                      : 'bg-indigo-500/[0.04] hover:bg-indigo-500/[0.06]'
                  }`}
                >
                  {/* Notification Icon */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        item.is_read
                          ? 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                          : 'brand-gradient text-white shadow-lg shadow-indigo-500/20'
                      }`}
                    >
                      <Bell size={16} />
                    </div>
                    {!item.is_read && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-[var(--bg-card)] shadow-sm" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <b className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.title}</b>
                        {!item.is_read && <Badge variant="info" size="sm">New</Badge>}
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.message}</p>
                  </div>

                  {/* Mark Read Action */}
                  {!item.is_read && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => markRead(item.id)}
                      aria-label="Mark notification as read"
                      title="Mark as Read"
                      className="shrink-0 mt-0.5 rounded-lg"
                    >
                      <Check size={15} />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              image={IMAGES.empty.noData}
              title="No notifications"
              description="You're all caught up. New activity will appear here."
            />
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}

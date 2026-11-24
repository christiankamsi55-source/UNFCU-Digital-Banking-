import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { Announcement, Notification } from '../../types';
import { api } from '../../lib/api';
import {
  markNotificationReadInFirestore,
  getUserNotificationsFromFirestore,
  getActiveAnnouncementsFromFirestore,
} from '../../lib/firebaseStore';
import { formatTransactionDateTime } from '../../lib/formatters';
import { localizeNotification, resolveAnnouncementContent } from '../../lib/i18n/notifications';
import { getLanguageOption } from '../../lib/i18n';
import {
  Bell,
  Clock,
  ShieldAlert,
  CheckCheck,
  RefreshCw,
  ArrowDown,
  Send,
  ChevronLeft,
  Megaphone,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { user, t, language, countryCode, refreshUserData } = useAuth();
  const { goBack } = useDevice();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const [res, annRes, fsAnns] = await Promise.all([
        api.getNotifications().catch(() => ({ notifications: [] })),
        api.getPublicAnnouncements().catch(() => ({ announcements: [] })),
        getActiveAnnouncementsFromFirestore().catch(() => []),
      ]);
      let list: Notification[] = res.notifications || [];

      const annMap = new Map<string, Announcement>();
      (annRes.announcements || []).forEach((a) => annMap.set(a.id, a));
      (fsAnns || []).forEach((a) => annMap.set(a.id, a));
      setAnnouncements(
        Array.from(annMap.values())
          .filter((a) => a.active)
          .sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt).getTime() -
              new Date(a.updatedAt || a.createdAt).getTime()
          )
      );

      if (user) {
        try {
          const firestoreNotifs = await getUserNotificationsFromFirestore(user.id);
          const map = new Map<string, Notification>();
          list.forEach((n) => map.set(n.id, n));
          firestoreNotifs.forEach((n) => {
            if (!map.has(n.id)) map.set(n.id, n);
            else map.set(n.id, { ...map.get(n.id)!, ...n });
          });
          list = Array.from(map.values());
        } catch {}
      }

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(list);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
    } catch {}
    markNotificationReadInFirestore(id, true).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await refreshUserData();
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
    } catch {}
    notifications.forEach((n) => {
      markNotificationReadInFirestore(n.id, true).catch(() => {});
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await refreshUserData();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadLabel =
    unreadCount > 0
      ? (unreadCount === 1
          ? t.notifications.unreadSingular
          : t.notifications.unreadPlural
        ).replace('{count}', String(unreadCount))
      : t.notifications.allCaughtUp;

  return (
    <div className="flex-1 flex flex-col bg-[#E5EBF2] text-[#0F172A]">
      {/* UNFCU Deep Navy Sub-Header */}
      <div className="bg-[#173A52] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goBack('dashboard')}
            className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            aria-label={t.common.back}
          >
            <ChevronLeft className="w-5 h-5 rtl-flip" />
          </button>

          <div className="text-center min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">
              {t.notifications.title}
            </h1>
            <p className="text-[10px] text-blue-200 truncate">{unreadLabel}</p>
          </div>

          <button
            type="button"
            onClick={fetchNotifs}
            className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer shrink-0"
            title={t.common.refresh}
            aria-label={t.common.refresh}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Institutional Multilingual Announcements Panel */}
        {announcements.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 banking-card-shadow p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#173A52]">
              <Megaphone className="w-4 h-4 text-[#2166D5] shrink-0" />
              <span>{t.notifications.announcementsHeading}</span>
            </div>
            <div className="space-y-2.5">
              {announcements.map((ann) => {
                const resolved = resolveAnnouncementContent(ann, language);
                const fallbackLang = getLanguageOption(resolved.resolvedLanguage);
                return (
                  <div
                    key={ann.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-[#0F172A]">
                        {resolved.title}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ann.priority !== 'info' && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              ann.priority === 'urgent'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {ann.priority}
                          </span>
                        )}
                        {resolved.isFallbackLanguage && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                            {t.common.fallbackLangBadge}: {fallbackLang.nativeName}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed break-words">
                      {resolved.body}
                    </p>
                    {resolved.isFallbackLanguage && (
                      <p className="text-[10px] text-slate-500 italic">
                        {t.notifications.originalLanguageNotice} ({fallbackLang.nativeName})
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 block">
                      {formatTransactionDateTime(ann.updatedAt || ann.createdAt, language, countryCode)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {unreadCount > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-xs font-bold text-[#2166D5] hover:text-[#173A52] bg-white border border-slate-200 hover:border-[#2166D5]/40 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{t.notifications.markAllRead}</span>
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="bg-white rounded-2xl border border-slate-200 banking-card-shadow overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-[#2166D5] rounded-full animate-spin mx-auto mb-2" />
              {t.common.loading}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-slate-500 space-y-2">
              <Bell className="w-8 h-8 text-slate-300 mx-auto" />
              <p>{t.notifications.noNotifications}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => {
                const localized = localizeNotification(n, language, t, countryCode);
                const titleLower = `${n.title} ${n.message}`.toLowerCase();
                const isCredit =
                  n.type === 'credit' ||
                  titleLower.includes('credit') ||
                  titleLower.includes('received');
                const isDebit =
                  n.type === 'debit' ||
                  titleLower.includes('debit') ||
                  titleLower.includes('transfer') ||
                  titleLower.includes('withdrawal');

                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && handleMarkRead(n.id)}
                    className={`p-4 transition-colors flex items-start justify-between gap-3 ${
                      n.read
                        ? 'bg-white hover:bg-[#F8FAFC]'
                        : 'bg-[#F0F6FF] hover:bg-[#E6F0FE] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                          isCredit
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : isDebit
                            ? 'bg-rose-50 border-rose-200 text-rose-600'
                            : n.type === 'payment'
                            ? 'bg-[#EBF2FC] border-[#2166D5]/25 text-[#2166D5]'
                            : n.type === 'security'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-slate-100 border-slate-200 text-[#2166D5]'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDown className="w-4 h-4" />
                        ) : isDebit ? (
                          <Send className="w-4 h-4" />
                        ) : n.type === 'payment' ? (
                          <Clock className="w-4 h-4" />
                        ) : n.type === 'security' ? (
                          <ShieldAlert className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-[#0F172A]">
                            {localized.title}
                          </span>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-[#2166D5] shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed break-words">
                          {localized.message}
                        </p>
                        <span className="text-[11px] text-slate-400 block pt-0.5">
                          {formatTransactionDateTime(n.createdAt, language, countryCode)}
                        </span>
                      </div>
                    </div>

                    {!n.read && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(n.id);
                        }}
                        className="text-[11px] font-bold text-[#2166D5] hover:text-[#173A52] px-2.5 py-1 rounded-lg bg-white border border-slate-200 shrink-0 cursor-pointer"
                      >
                        {t.notifications.markRead}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

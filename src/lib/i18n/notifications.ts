import { Announcement, Notification, SupportedLanguage } from '../../types';
import { formatCurrencyAmount } from '../formatters';
import { EN_TRANSLATIONS } from './en';
import { Translations } from './types';

function interpolateTemplate(
  template: string,
  params: Record<string, string | number>,
  language: SupportedLanguage,
  countryCode?: string | null,
  t?: Translations
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const raw = params[key];
    if (raw === undefined || raw === null) return '';
    if (key === 'method') {
      const m = String(raw).toLowerCase();
      if (m.includes('bitcoin') || m === 'btc') {
        return t?.feeDialog.bitcoinOption || 'Bitcoin (BTC)';
      }
      if (m.includes('bank') || m === 'bank_transfer' || m === 'wire') {
        return t?.feeDialog.bankTransferOption || 'Bank Transfer';
      }
      return String(raw);
    }
    if (['amount', 'fee', 'total', 'newBalance', 'previousBalance'].includes(key)) {
      const num = Number(raw);
      if (Number.isFinite(num)) {
        return formatCurrencyAmount(num, language, countryCode);
      }
    }
    return String(raw);
  });
}

function getTemplatePair(
  templateKey: string,
  t: Translations
): { titleTpl: string; msgTpl: string } | null {
  switch (templateKey) {
    case 'welcome':
      return { titleTpl: t.notifications.tplWelcomeTitle, msgTpl: t.notifications.tplWelcomeMsg };
    case 'admin_credit':
    case 'credit':
      return { titleTpl: t.notifications.tplCreditTitle, msgTpl: t.notifications.tplCreditMsg };
    case 'admin_debit':
    case 'debit':
      return { titleTpl: t.notifications.tplDebitTitle, msgTpl: t.notifications.tplDebitMsg };
    case 'transfer_completed':
      return { titleTpl: t.notifications.tplTransferDoneTitle, msgTpl: t.notifications.tplTransferDoneMsg };
    case 'withdrawal_completed':
      return { titleTpl: t.notifications.tplWithdrawalDoneTitle, msgTpl: t.notifications.tplWithdrawalDoneMsg };
    case 'payment_submitted':
      return { titleTpl: t.notifications.tplPaymentSubmittedTitle, msgTpl: t.notifications.tplPaymentSubmittedMsg };
    case 'payment_verified':
      return { titleTpl: t.notifications.tplPaymentVerifiedTitle, msgTpl: t.notifications.tplPaymentVerifiedMsg };
    case 'payment_rejected':
      return { titleTpl: t.notifications.tplPaymentRejectedTitle, msgTpl: t.notifications.tplPaymentRejectedMsg };
    case 'payment_pending':
      return { titleTpl: t.notifications.tplPaymentPendingTitle, msgTpl: t.notifications.tplPaymentPendingMsg };
    case 'payment_cancelled':
      return { titleTpl: t.notifications.tplPaymentCancelledTitle, msgTpl: t.notifications.tplPaymentCancelledMsg };
    default:
      return null;
  }
}

function matchLegacyNotification(
  notification: Notification
): { templateKey: string; params: Record<string, string | number> } | null {
  const title = notification.title || '';
  const msg = notification.message || '';

  if (
    title.includes('Welcome to United Nation Gold Chase Bank') ||
    title.includes('Welcome to United Nations Federal Credit Union') ||
    title.includes('Welcome to UNFCU')
  ) {
    const acctMatch = msg.match(/(?:UNGB|UNFCU)-[\d-]+/i);
    return {
      templateKey: 'welcome',
      params: { accountNumber: acctMatch ? acctMatch[0] : '' },
    };
  }

  if (title.startsWith('Account Credited')) {
    const amtMatch = msg.match(/\$([\d,.]+)\s*USD/i);
    const refMatch = msg.match(/Reference:\s*([A-Z0-9-]+)/i);
    const balMatch = msg.match(/New balance:\s*\$([\d,.]+)\s*USD/i);
    const reasonMatch = msg.match(/Reason:\s*(.+)$/i);
    return {
      templateKey: 'admin_credit',
      params: {
        amount: amtMatch ? Number(amtMatch[1].replace(/,/g, '')) : notification.amount || 0,
        reference: refMatch ? refMatch[1] : notification.reference || '',
        newBalance: balMatch ? Number(balMatch[1].replace(/,/g, '')) : 0,
        reason: reasonMatch ? reasonMatch[1].trim() : '',
      },
    };
  }

  if (title.startsWith('Account Debited')) {
    const amtMatch = msg.match(/\$([\d,.]+)\s*USD/i);
    const refMatch = msg.match(/Reference:\s*([A-Z0-9-]+)/i);
    const balMatch = msg.match(/New balance:\s*\$([\d,.]+)\s*USD/i);
    const reasonMatch = msg.match(/Reason:\s*(.+)$/i);
    return {
      templateKey: 'admin_debit',
      params: {
        amount: amtMatch ? Number(amtMatch[1].replace(/,/g, '')) : notification.amount || 0,
        reference: refMatch ? refMatch[1] : notification.reference || '',
        newBalance: balMatch ? Number(balMatch[1].replace(/,/g, '')) : 0,
        reason: reasonMatch ? reasonMatch[1].trim() : '',
      },
    };
  }

  if (title === 'Transfer Completed') {
    const m = msg.match(/Transfer of \$([\d,.]+) USD to (.+?) \((.+?)\) completed\. Fee: \$([\d,.]+) USD\. Total: \$([\d,.]+) USD\. Ref: ([A-Z0-9-]+)/i);
    if (m) {
      return {
        templateKey: 'transfer_completed',
        params: {
          amount: Number(m[1].replace(/,/g, '')),
          recipient: m[2],
          bank: m[3],
          fee: Number(m[4].replace(/,/g, '')),
          total: Number(m[5].replace(/,/g, '')),
          reference: m[6],
        },
      };
    }
  }

  if (title === 'Withdrawal Completed') {
    const m = msg.match(/Withdrawal of \$([\d,.]+) USD to (.+?) \((.+?)\) completed\. Fee: \$([\d,.]+) USD\. Total: \$([\d,.]+) USD\. Ref: ([A-Z0-9-]+)/i);
    if (m) {
      return {
        templateKey: 'withdrawal_completed',
        params: {
          amount: Number(m[1].replace(/,/g, '')),
          bank: m[2],
          account: m[3],
          fee: Number(m[4].replace(/,/g, '')),
          total: Number(m[5].replace(/,/g, '')),
          reference: m[6],
        },
      };
    }
  }

  if (title === 'Payment Submitted for Verification') {
    const m = msg.match(/Your (.+?) payment details for \$([\d,.]+) USD have been submitted.*Ref:\s*([A-Z0-9-]+)/i);
    if (m) {
      return {
        templateKey: 'payment_submitted',
        params: {
          method: m[1],
          amount: Number(m[2].replace(/,/g, '')),
          reference: m[3],
        },
      };
    }
  }

  if (title === 'Payment Verified') {
    const m = msg.match(/Your (.+?) payment \(Ref:\s*([A-Z0-9-]+)\) for \$([\d,.]+) USD/i);
    if (m) {
      return {
        templateKey: 'payment_verified',
        params: {
          method: m[1],
          reference: m[2],
          amount: Number(m[3].replace(/,/g, '')),
        },
      };
    }
  }

  if (title === 'Payment Rejected') {
    const m = msg.match(/Your (.+?) payment \(Ref:\s*([A-Z0-9-]+)\) could not be verified\. Reason:\s*(.+?)\.?$/i);
    if (m) {
      return {
        templateKey: 'payment_rejected',
        params: {
          method: m[1],
          reference: m[2],
          reason: m[3],
        },
      };
    }
  }

  if (title.includes('Pending Verification')) {
    const refMatch = msg.match(/Ref:\s*([A-Z0-9-]+)/i);
    return {
      templateKey: 'payment_pending',
      params: { reference: refMatch ? refMatch[1] : notification.reference || '' },
    };
  }

  if (title === 'Transaction Cancelled') {
    const refMatch = msg.match(/Transaction\s+([A-Z0-9-]+)\s+has been cancelled/i);
    return {
      templateKey: 'payment_cancelled',
      params: { reference: refMatch ? refMatch[1] : notification.reference || '' },
    };
  }

  return null;
}

export function localizeNotification(
  notification: Notification,
  language: SupportedLanguage,
  t: Translations = EN_TRANSLATIONS,
  countryCode?: string | null
): { title: string; message: string } {
  // 1. Check explicit per-language translations map if present
  const direct = notification.translations?.[language];
  if (direct?.title && direct?.message) {
    return { title: direct.title, message: direct.message };
  }

  // 2. Structured templateKey + templateParams
  if (notification.templateKey) {
    const pair = getTemplatePair(notification.templateKey, t);
    if (pair) {
      const params = notification.templateParams || {};
      return {
        title: interpolateTemplate(pair.titleTpl, params, language, countryCode, t),
        message: interpolateTemplate(pair.msgTpl, params, language, countryCode, t),
      };
    }
  }

  // 3. Legacy stored notification pattern matcher
  const legacy = matchLegacyNotification(notification);
  if (legacy) {
    const pair = getTemplatePair(legacy.templateKey, t);
    if (pair) {
      return {
        title: interpolateTemplate(pair.titleTpl, legacy.params, language, countryCode, t),
        message: interpolateTemplate(pair.msgTpl, legacy.params, language, countryCode, t),
      };
    }
  }

  // 4. Safe fallback to stored content
  return {
    title: notification.title,
    message: notification.message,
  };
}

export function resolveAnnouncementContent(
  announcement: Announcement,
  language: SupportedLanguage
): {
  title: string;
  body: string;
  isFallbackLanguage: boolean;
  resolvedLanguage: string;
} {
  const titles = announcement.titleTranslations || {};
  const bodies = announcement.bodyTranslations || {};

  if (titles[language]?.trim() && bodies[language]?.trim()) {
    return {
      title: titles[language].trim(),
      body: bodies[language].trim(),
      isFallbackLanguage: false,
      resolvedLanguage: language,
    };
  }

  const candidates = [
    announcement.defaultLanguage,
    'en',
    ...Object.keys(titles),
  ].filter(Boolean) as string[];

  for (const cand of candidates) {
    if (titles[cand]?.trim() && bodies[cand]?.trim()) {
      return {
        title: titles[cand].trim(),
        body: bodies[cand].trim(),
        isFallbackLanguage: cand !== language,
        resolvedLanguage: cand,
      };
    }
  }

  return {
    title: Object.values(titles)[0] || '',
    body: Object.values(bodies)[0] || '',
    isFallbackLanguage: true,
    resolvedLanguage: announcement.defaultLanguage || 'en',
  };
}

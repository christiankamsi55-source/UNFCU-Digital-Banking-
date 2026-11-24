import { createTranslations } from './merge';
import { Translations } from './types';

export const MIDEAST_RTL_TRANSLATIONS: Record<'ar' | 'ur' | 'he' | 'fa', Translations> = {
  ar: createTranslations({
    simulatedFundsDisclaimer: 'أرصدة وعمليات حساب موثقة.',
    common: {
      home: 'الرئيسية', history: 'السجل', notifications: 'الإشعارات', settings: 'الإعدادات',
      back: 'رجوع', close: 'إغلاق', cancel: 'إلغاء', save: 'حفظ', saving: 'جارٍ الحفظ...',
      refresh: 'تحديث', copy: 'نسخ', copied: 'تم النسخ!', search: 'بحث', all: 'الكل',
      submit: 'إرسال', confirm: 'تأكيد', delete: 'حذف', edit: 'تعديل', loading: 'جارٍ التحميل...',
      yes: 'نعم', no: 'لا', optional: 'اختياري', or: 'أو', allRightsReserved: 'جميع الحقوق محفوظة.',
      encryptionLabel: 'تشفير TLS 256-bit', digitalBanking: 'الخدمات المصرفية الرقمية',
      privateDigitalBanking: 'الخدمات المصرفية الخاصة الرقمية', adminPortal: 'بوابة الإدارة', fallbackLangBadge: 'اللغة الأصلية',
    },
    languageModal: {
      title: 'اختر لغة التطبيق', subtitle: 'ترجمة فورية لجميع الشاشات والإيصالات والتنبيهات',
      searchPlaceholder: 'ابحث عن اللغة...', noResults: 'لم يتم العثور على لغة مطابقة', rtlBadge: 'من اليمين لليسار', selectLanguage: 'اختر اللغة',
    },
    countryModal: {
      title: 'اختر الدولة / المنطقة', subtitle: 'إعدادات التنسيق الإقليمي ورمز الاتصال بشكل مستقل (لا يغيّر اللغة)',
      searchPlaceholder: 'ابحث عن الدولة أو المنطقة أو رمز الاتصال...', noResults: 'لم يتم العثور على دولة', allRegions: 'جميع المناطق',
      independentNote: 'يظل رصيد الحساب بالدولار الأمريكي (USD) مع تنسيق الأرقام والتواريخ إقليمياً.',
    },
    nav: {
      home: 'نظرة عامة', dashboard: 'لوحة التحكم', transfer: 'تحويل', withdrawal: 'سحب',
      history: 'سجل المعاملات', notifications: 'الإشعارات', profile: 'الملف الشخصي والإعدادات',
      adminLogin: 'دخول المسؤول', adminConsole: 'لوحة الإدارة', logout: 'تسجيل الخروج',
      signIn: 'تسجيل الدخول', register: 'فتح حساب', deviceView: 'عرض الجهاز', language: 'اللغة', country: 'الدولة',
    },
    landing: {
      welcomeBack: 'مرحباً بعودتك', tagline: 'آمن. بسيط. موثوق.', bankingTagline: 'خدمات مصرفية لغد أفضل',
      loginWithGmail: 'تسجيل الدخول عبر Gmail', createAccount: 'إنشاء حساب', securityMessage: 'أمانك هو أولويتنا',
      openAccount: 'فتح حساب جديد', exploreDemo: 'دخول بوابة العملاء', adminPortalLink: 'بوابة المسؤول',
    },
    auth: {
      signInTitle: 'تسجيل الدخول عبر Gmail', signInSubtitle: 'سجّل الدخول إلى حسابك المسجل في UNFCU Digital Banking',
      registerTitle: 'إنشاء حساب', registerSubtitle: 'افتح حسابك المصرفي الدائم',
      emailLabel: 'عنوان Gmail', passwordLabel: 'كلمة المرور', confirmPasswordLabel: 'تأكيد كلمة المرور',
      fullNameLabel: 'الاسم القانوني الكامل', countryLabel: 'الدولة / المنطقة', phoneLabel: 'رقم الهاتف', languageLabel: 'اللغة المفضلة',
      submitSignIn: 'تسجيل الدخول', submitRegister: 'إنشاء الحساب وتأكيد البريد', forgotPassword: 'نسيت كلمة المرور؟',
      resetPasswordTitle: 'إعادة تعيين كلمة المرور', resetPasswordSubtitle: 'أدخل بريدك المسجل لاستلام رابط إعادة تعيين آمن من Firebase.',
      sendResetLinkBtn: 'إرسال رابط إعادة التعيين', newPasswordLabel: 'كلمة المرور الجديدة',
      resetPasswordSubmit: 'تحديث كلمة المرور', haveAccount: 'لديك حساب بالفعل؟ تسجيل الدخول', needAccount: 'ليس لديك حساب؟ إنشاء حساب',
      verifyEmailTitle: 'تأكيد البريد الإلكتروني', verifyContinueBtn: 'تم التحقق — إكمال التسجيل', resendVerificationBtn: 'إعادة إرسال رابط التحقق',
      verifying: 'جارٍ التحقق...', signingIn: 'جارٍ تسجيل الدخول...', creatingAccount: 'جارٍ إنشاء الحساب...',
    },
    errors: {
      noAccountFound: 'لم يتم العثور على حساب مسجل. يرجى إنشاء حساب أولاً.',
      invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      emailNotVerified: 'لم يتم التحقق من بريدك الإلكتروني بعد. يرجى النقر على رابط التحقق في بريدك الوارد.',
      insufficientFunds: 'الرصيد المتاح غير كافٍ لإتمام هذه العملية.',
    },
    dashboard: {
      helloGreeting: 'مرحباً', welcome: 'مرحباً بعودتك', welcomeToAccount: 'مرحباً بك في حسابك',
      accountNumber: 'رقم الحساب', availableBalance: 'الرصيد المتاح', hideBalance: 'إخفاء الرصيد', showBalance: 'إظهار الرصيد',
      sendMoney: 'إرسال أموال', receiveMoney: 'استلام أموال', withdrawToBank: 'سحب إلى البنك', trackReceipts: 'متابعة المدفوعات',
      recentActivity: 'أحدث المعاملات', noTransactions: 'لا توجد معاملات مسجلة حتى الآن.', viewAll: 'عرض الكل',
      notifBannerTitle: 'إشعارات الحساب وتنبيهات الأمان', notifBannerSub: 'اضغط لعرض آخر التحديثات والتنبيهات',
      moneyReceived: 'أموال مستلمة', moneySent: 'أموال مرسلة', withdrawalLabel: 'سحب', inReview: 'قيد المراجعة',
      receiveModalTitle: 'استلام أموال', receiveModalSub: 'شارك بيانات حسابك الموثقة لاستلام التحويلات',
      accountHolder: 'صاحب الحساب', bankName: 'اسم البنك', currencyLabel: 'العملة', copyAccountNumber: 'نسخ رقم الحساب',
      announcementsTitle: 'إعلانات البنك',
    },
    transfer: {
      title: 'إرسال أموال / تحويل بنكي', recipientName: 'اسم المستلم القانوني', recipientBank: 'اسم البنك المستلم',
      recipientAccount: 'رقم الحساب / IBAN', amountLabel: 'مبلغ التحويل (USD)', availableLabel: 'المتاح',
      principalLabel: 'المبلغ الأساسي', applicableFeeLabel: 'الرسوم المطبقة', totalAmountLabel: 'المبلغ الإجمالي', continueBtn: 'تحويل الأموال',
    },
    withdrawal: {
      title: 'سحب الأموال', destBank: 'البنك التجاري المستلم', accountHolder: 'اسم صاحب الحساب',
      accountNum: 'رقم الحساب المستلم', amountLabel: 'مبلغ السحب (USD)', availableLabel: 'المتاح', continueBtn: 'سحب الأموال',
    },
    history: {
      title: 'سجل المعاملات', searchPlaceholder: 'ابحث بالمرجع أو المستلم أو البنك...',
      filterAll: 'الكل', filterIncoming: 'الواردة', filterTransfers: 'التحويلات الصادرة', filterWithdrawals: 'السحوبات',
      allDates: 'كل التواريخ', last24h: '24 ساعة', last7d: '7 أيام', last30d: '30 يوماً',
      statusCompleted: 'مكتمل', statusPending: 'قيد الانتظار', statusAwaitingReview: 'قيد المراجعة', statusFailed: 'فشل', statusCancelled: 'ملغي',
      noResults: 'لا توجد معاملات مطابقة.', receiptTitle: 'إيصال المعاملة الرقمي', printReceipt: 'طباعة / حفظ الإيصال',
    },
    notifications: {
      title: 'الإشعارات', unreadSingular: 'تحديث غير مقروء', unreadPlural: 'تحديثات غير مقروءة',
      allCaughtUp: 'تمت قراءة الكل', markRead: 'تحديد كمقروء', markAllRead: 'تحديد الكل كمقروء', noNotifications: 'لا توجد إشعارات.',
      announcementsHeading: 'الإعلانات الرسمية للبنك', originalLanguageNotice: 'معروض باللغة الأصلية',
      tplWelcomeTitle: 'مرحباً بك في United Nations Federal Credit Union (UNFCU)', tplWelcomeMsg: 'تم تفعيل محفظتك الرقمية {{accountNumber}}.',
      tplCreditTitle: 'تم إيداع رصيد — ${{amount}} USD', tplCreditMsg: 'تم تسجيل إيداع بقيمة ${{amount}} USD. المرجع: {{reference}}. الرصيد الجديد: ${{newBalance}} USD. السبب: {{reason}}',
      tplDebitTitle: 'تم خصم رصيد — ${{amount}} USD', tplDebitMsg: 'تم تسجيل خصم بقيمة ${{amount}} USD. المرجع: {{reference}}. الرصيد الجديد: ${{newBalance}} USD. السبب: {{reason}}',
      tplTransferDoneTitle: 'اكتمل التحويل', tplTransferDoneMsg: 'تم تحويل ${{amount}} USD إلى {{recipient}} ({{bank}}). الرسوم: ${{fee}} USD. الإجمالي: ${{total}} USD. المرجع: {{reference}}.',
      tplWithdrawalDoneTitle: 'اكتمل السحب', tplWithdrawalDoneMsg: 'تم سحب ${{amount}} USD إلى {{bank}} ({{account}}). الرسوم: ${{fee}} USD. الإجمالي: ${{total}} USD. المرجع: {{reference}}.',
      tplPaymentSubmittedTitle: 'تم إرسال الدفعة للتحقق', tplPaymentSubmittedMsg: 'تم إرسال تفاصيل الدفع عبر {{method}} بمبلغ ${{amount}} USD وهي بانتظار التأكيد. المرجع: {{reference}}.',
      tplPaymentVerifiedTitle: 'تم التحقق من الدفعة', tplPaymentVerifiedMsg: 'تم التحقق وتأكيد دفعتك عبر {{method}} (المرجع: {{reference}}) بمبلغ ${{amount}} USD.',
      tplPaymentRejectedTitle: 'تم رفض الدفعة', tplPaymentRejectedMsg: 'تعذر التحقق من دفعتك عبر {{method}} (المرجع: {{reference}}). السبب: {{reason}}.',
      tplPaymentPendingTitle: 'الحالة: بانتظار التحقق', tplPaymentPendingMsg: 'تم تحديث طلب الدفع الخاص بك (المرجع: {{reference}}) إلى قيد التحقق.',
      tplPaymentCancelledTitle: 'تم إلغاء المعاملة', tplPaymentCancelledMsg: 'تم إلغاء المعاملة {{reference}} وإعادة المبلغ إلى محفظتك.',
    },
    profile: {
      title: 'إعدادات الحساب والتفضيلات', personalInfo: 'المعلومات الشخصية', countrySettings: 'الدولة / المنطقة',
      languageSettings: 'لغة التطبيق', changeCountryBtn: 'تغيير الدولة / المنطقة', changeLanguageBtn: 'تغيير اللغة',
      saveChanges: 'حفظ التفضيلات', savedSuccess: 'تم حفظ التفضيلات بنجاح.', accountActions: 'إجراءات الحساب',
    },
    admin: { dashboardTitle: 'وحدة تحكم المسؤول', announcementsTab: 'الإعلانات' },
  }),

  ur: createTranslations({
    common: {
      home: 'ہوم', history: 'تاریخ', notifications: 'اطلاعات', settings: 'ترتیبات',
      back: 'واپس', close: 'بند کریں', cancel: 'منسوخ', save: 'محفوظ کریں',
      refresh: 'تازہ کریں', copy: 'کاپی', copied: 'کاپی ہو گیا!', search: 'تلاش کریں', all: 'سب',
    },
    landing: {
      welcomeBack: 'خوش آمدید', tagline: 'محفوظ۔ سادہ۔ قابل اعتماد۔',
      loginWithGmail: 'Gmail سے لاگ ان کریں', createAccount: 'اکاؤنٹ بنائیں', securityMessage: 'آپ کی حفاظت ہماری ترجیح ہے',
    },
    dashboard: {
      helloGreeting: 'سلام', availableBalance: 'دستیاب بیلنس', sendMoney: 'رقم بھیجیں',
      receiveMoney: 'رقم وصول کریں', recentActivity: 'حالیہ لین دین', viewAll: 'سب دیکھیں', announcementsTitle: 'بینک اعلانات',
    },
    errors: { noAccountFound: 'کوئی رجسٹرڈ اکاؤنٹ نہیں ملا۔ براہ کرم پہلے اکاؤنٹ بنائیں۔' },
    profile: { title: 'اکاؤنٹ کی ترتیبات', saveChanges: 'ترتیبات محفوظ کریں' },
    admin: { dashboardTitle: 'ایڈمنسٹریٹر کنسول', announcementsTab: 'اعلانات' },
  }),

  he: createTranslations({
    common: {
      home: 'דף הבית', history: 'היסטוריה', notifications: 'התראות', settings: 'הגדרות',
      back: 'חזרה', close: 'סגור', cancel: 'ביטול', save: 'שמור',
      refresh: 'רענן', copy: 'העתק', copied: 'הועתק!', search: 'חיפוש', all: 'הכל',
    },
    landing: {
      welcomeBack: 'ברוך שובך', tagline: 'מאובטח. פשוט. אמין.',
      loginWithGmail: 'התחבר עם Gmail', createAccount: 'צור חשבון', securityMessage: 'האבטחה שלך היא בראש סדר העדיפויות שלנו',
    },
    dashboard: {
      helloGreeting: 'שלום', availableBalance: 'יתרה זמינה', sendMoney: 'שלח כסף',
      receiveMoney: 'קבל כסף', recentActivity: 'עסקאות אחרונות', viewAll: 'הצג הכל', announcementsTitle: 'הודעות הבנק',
    },
    errors: { noAccountFound: 'לא נמצא חשבון רשום. אנא צור חשבון תחילה.' },
    profile: { title: 'הגדרות חשבון', saveChanges: 'שמור העדפות' },
    admin: { dashboardTitle: 'מסוף מנהל מערכת', announcementsTab: 'הודעות' },
  }),

  fa: createTranslations({
    common: {
      home: 'خانه', history: 'تاریخچه', notifications: 'اعلان‌ها', settings: 'تنظیمات',
      back: 'بازگشت', close: 'بستن', cancel: 'لغو', save: 'ذخیره',
      refresh: 'بروزرسانی', copy: 'کپی', copied: 'کپی شد!', search: 'جستجو', all: 'همه',
    },
    landing: {
      welcomeBack: 'خوش آمدید', tagline: 'امن. ساده. قابل اعتماد.',
      loginWithGmail: 'ورود با Gmail', createAccount: 'ایجاد حساب', securityMessage: 'امنیت شما اولویت ماست',
    },
    dashboard: {
      helloGreeting: 'سلام', availableBalance: 'موجودی قابل برداشت', sendMoney: 'ارسال وجه',
      receiveMoney: 'دریافت وجه', recentActivity: 'تراکنش‌های اخیر', viewAll: 'مشاهده همه', announcementsTitle: 'اطلاعیه‌های بانک',
    },
    errors: { noAccountFound: 'هیچ حساب ثبت‌شده‌ای یافت نشد. لطفاً ابتدا حساب ایجاد کنید.' },
    profile: { title: 'تنظیمات حساب', saveChanges: 'ذخیره تنظیمات' },
    admin: { dashboardTitle: 'کنسول مدیریت', announcementsTab: 'اطلاعیه‌ها' },
  }),
};

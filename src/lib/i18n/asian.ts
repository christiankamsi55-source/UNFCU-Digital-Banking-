import { createTranslations } from './merge';
import { Translations } from './types';

export const ASIAN_TRANSLATIONS: Record<
  'zh-CN' | 'zh-TW' | 'ja' | 'ko' | 'vi' | 'hi' | 'bn' | 'id' | 'ms' | 'th' | 'fil',
  Translations
> = {
  'zh-CN': createTranslations({
    simulatedFundsDisclaimer: '已验证账户余额与交易操作。',
    common: {
      home: '首页', history: '历史记录', notifications: '通知', settings: '设置',
      back: '返回', close: '关闭', cancel: '取消', save: '保存', saving: '正在保存...',
      refresh: '刷新', copy: '复制', copied: '已复制！', search: '搜索', all: '全部',
      submit: '提交', confirm: '确认', delete: '删除', edit: '编辑', loading: '加载中...',
      yes: '是', no: '否', optional: '可选', or: '或', allRightsReserved: '保留所有权利。',
      encryptionLabel: '256位 TLS 加密', digitalBanking: '数字银行', privateDigitalBanking: '私人数字银行',
      adminPortal: '管理员门户', fallbackLangBadge: '原始语言',
    },
    languageModal: {
      title: '选择应用语言', subtitle: '所有页面、回执与通知实时切换语言',
      searchPlaceholder: '搜索语言...', noResults: '未找到匹配语言', rtlBadge: '从右到左', selectLanguage: '选择语言',
    },
    countryModal: {
      title: '选择国家 / 地区', subtitle: '独立的区域格式与国际区号（不会更改您的语言）',
      searchPlaceholder: '搜索国家、地区或区号...', noResults: '未找到匹配国家', allRegions: '所有地区',
      independentNote: '账本金额始终保持美元 (USD)，仅调整数字和日期显示格式。',
    },
    nav: {
      home: '概览', dashboard: '仪表盘', transfer: '转账', withdrawal: '提现',
      history: '交易历史', notifications: '通知中心', profile: '个人资料与设置',
      adminLogin: '管理员登录', adminConsole: '管理控制台', logout: '退出登录',
      signIn: '登录', register: '立即开户', deviceView: '设备视图', language: '语言', country: '国家',
    },
    landing: {
      welcomeBack: '欢迎回来', tagline: '安全 · 简洁 · 可靠', bankingTagline: '为更美好的明天提供银行服务',
      loginWithGmail: '使用 Gmail 登录', createAccount: '创建账户', securityMessage: '您的安全是我们的首要任务',
      openAccount: '立即开户', exploreDemo: '进入客户门户', adminPortalLink: '管理员入口',
      featuresTitle: '随时随地，轻松银行体验', featuresSubtitle: '跨设备无缝访问您的数字银行账户服务。',
      feature1Title: '安全账户访问', feature1Desc: '采用经过验证的安全身份认证保护账户。',
      feature2Title: '全球多语言支持', feature2Desc: '独立选择您的国家/地区与首选语言。',
      feature3Title: '转账与支付服务', feature3Desc: '便捷安全的国内外转账与提现处理。',
      feature4Title: '多设备同步', feature4Desc: '支持手机、平板与桌面浏览器实时同步。',
    },
    auth: {
      signInTitle: '使用 Gmail 登录', signInSubtitle: '登录您已注册的 UNFCU Digital Banking 账户',
      registerTitle: '创建账户', registerSubtitle: '开通您的永久数字银行账户',
      emailLabel: 'Gmail 邮箱地址', passwordLabel: '密码', confirmPasswordLabel: '确认密码',
      fullNameLabel: '法定全名', countryLabel: '国家 / 地区', phoneLabel: '手机号码', languageLabel: '首选语言',
      submitSignIn: '登录账户', submitRegister: '创建账户并验证邮箱', forgotPassword: '忘记密码？',
      resetPasswordTitle: '重置密码', resetPasswordSubtitle: '输入您的注册邮箱以接收 Firebase 安全重置链接。',
      sendResetLinkBtn: '发送重置密码链接', newPasswordLabel: '新密码', resetPasswordSubmit: '更新密码',
      haveAccount: '已有账户？立即登录', needAccount: '没有账户？创建账户',
      verifyEmailTitle: '验证您的邮箱', verifyEmailSubtitle: '请点击收件箱中的 Firebase 验证链接，然后点击继续。',
      verifyContinueBtn: '我已完成验证 — 完成注册', resendVerificationBtn: '重新发送验证邮件',
      verifying: '验证中...', signingIn: '正在登录...', creatingAccount: '正在创建账户...',
      noAccountFoundTitle: '未找到账户', noAccountFoundBtn: '注册新账户',
    },
    errors: {
      noAccountFound: '未找到已注册账户，请先创建账户。',
      invalidCredentials: '邮箱地址或密码无效。',
      emailNotVerified: '您的邮箱尚未验证，请先点击收件箱中的验证链接。',
      insufficientFunds: '可用余额不足，无法完成此次操作。',
    },
    dashboard: {
      helloGreeting: '您好', welcome: '欢迎回来', welcomeToAccount: '欢迎来到您的账户',
      accountNumber: '账号', acctPrefix: '账号', availableBalance: '可用余额', walletBalance: '可用余额',
      hideBalance: '隐藏余额', showBalance: '显示余额', sendMoney: '汇款转账', receiveMoney: '收款',
      withdrawToBank: '提现至银行', trackReceipts: '查看付款状态', paymentStatus: '付款状态',
      recentActivity: '最近交易', noTransactions: '暂无交易记录。', viewAll: '查看全部',
      notifBannerTitle: '账户通知与安全提醒', notifBannerSub: '点击查看最新账户动态与安全通知',
      moneyReceived: '已收款', moneySent: '已汇出', withdrawalLabel: '提现', inReview: '审核中',
      receiveModalTitle: '收款信息', receiveModalSub: '分享您的认证账户信息以接收汇入资金',
      accountHolder: '账户持有人', bankName: '银行名称', currencyLabel: '币种', copyAccountNumber: '复制账号',
      announcementsTitle: '银行公告',
    },
    transfer: {
      title: '汇款 / 账户转账', recipientName: '收款人法定姓名', recipientBank: '收款银行名称',
      recipientAccount: '收款账号 / IBAN', amountLabel: '转账金额 (USD)', availableLabel: '可用余额',
      descriptionLabel: '付款附言 / 参考说明（可选）', principalLabel: '转账本金', applicableFeeLabel: '适用手续费',
      totalAmountLabel: '总计金额', waivedLabel: '已免除', continueBtn: '确认转账',
    },
    withdrawal: {
      title: '资金提取 / 银行提现', destBank: '目标商业银行', accountHolder: '账户持有人姓名',
      accountNum: '目标银行账号', routingNum: 'ABA 路由号（可选）', amountLabel: '提现金额 (USD)',
      availableLabel: '可用余额', continueBtn: '提交提现',
    },
    history: {
      title: '交易历史', searchPlaceholder: '按参考号、收款人或银行搜索...',
      filterAll: '全部', filterIncoming: '收入', filterTransfers: '汇出转账', filterWithdrawals: '提现',
      allDates: '全部时间', last24h: '24小时内', last7d: '7天内', last30d: '30天内',
      statusCompleted: '已完成', statusPending: '处理中', statusAwaitingReview: '待审核', statusFailed: '失败', statusCancelled: '已取消',
      noResults: '未找到符合条件的交易记录。', receiptTitle: '电子交易回执', printReceipt: '打印 / 保存回执',
    },
    notifications: {
      title: '通知中心', unreadSingular: '条未读消息', unreadPlural: '条未读消息',
      allCaughtUp: '已全部阅读', markRead: '标为已读', markAllRead: '全部标为已读', noNotifications: '暂无通知。',
      announcementsHeading: '官方银行公告', originalLanguageNotice: '以原始语言显示',
      tplWelcomeTitle: '欢迎使用 United Nations Federal Credit Union (UNFCU)', tplWelcomeMsg: '您的数字钱包 {{accountNumber}} 已激活。',
      tplCreditTitle: '账户入账 — ${{amount}} USD', tplCreditMsg: '您的账户已入账 ${{amount}} USD。参考号：{{reference}}。新余额：${{newBalance}} USD。原因：{{reason}}',
      tplDebitTitle: '账户扣款 — ${{amount}} USD', tplDebitMsg: '您的账户已扣款 ${{amount}} USD。参考号：{{reference}}。新余额：${{newBalance}} USD。原因：{{reason}}',
      tplTransferDoneTitle: '转账已完成', tplTransferDoneMsg: '向 {{recipient}}（{{bank}}）转账 ${{amount}} USD 已完成。手续费：${{fee}} USD。总计：${{total}} USD。参考号：{{reference}}。',
      tplWithdrawalDoneTitle: '提现已完成', tplWithdrawalDoneMsg: '向 {{bank}}（{{account}}）提现 ${{amount}} USD 已完成。手续费：${{fee}} USD。总计：${{total}} USD。参考号：{{reference}}。',
      tplPaymentSubmittedTitle: '付款凭据已提交审核', tplPaymentSubmittedMsg: '您的 {{method}} 付款凭据（${{amount}} USD）已提交，等待确认。参考号：{{reference}}。',
      tplPaymentVerifiedTitle: '付款已核实', tplPaymentVerifiedMsg: '您的 {{method}} 付款（参考号：{{reference}}，金额 ${{amount}} USD）已审核通过。',
      tplPaymentRejectedTitle: '付款未通过验证', tplPaymentRejectedMsg: '您的 {{method}} 付款（参考号：{{reference}}）未能核实。原因：{{reason}}。',
      tplPaymentPendingTitle: '状态更新：等待审核', tplPaymentPendingMsg: '您的付款提交（参考号：{{reference}}）已更新为等待审核。',
      tplPaymentCancelledTitle: '交易已取消', tplPaymentCancelledMsg: '交易 {{reference}} 已取消，相关资金已退回您的钱包。',
    },
    profile: {
      title: '账户设置与偏好', personalInfo: '个人资料', countrySettings: '国家 / 地区格式设置',
      languageSettings: '应用显示语言', changeCountryBtn: '更改国家 / 地区', changeLanguageBtn: '更改语言',
      saveChanges: '保存偏好设置', savedSuccess: '偏好设置已保存至 Cloud Firestore。', accountActions: '账户操作',
    },
    footer: {
      customerInfoHeading: '客户信息', platformSupportHeading: '平台与支持',
      accountSecurity: '账户安全', paymentInfo: '付款信息', transactionFees: '交易费用',
      disputeResolution: '投诉与争议解决', faqs: '常见问题', aboutUs: '关于我们', contactUs: '联系我们',
      privacyPolicy: '隐私政策', termsConditions: '条款与条件', security: '安全架构', helpSupport: '帮助与支持',
      transactionInfo: '交易说明', adminSignIn: '管理员登录',
    },
    admin: {
      dashboardTitle: '管理员指挥控制台', usersTab: '用户账户', paymentReviewTab: '付款审核队列',
      feeSettingsTab: '费率管理', paymentMethodsTab: '收款方式', announcementsTab: '银行公告', auditLogsTab: '审计日志', transactionsTab: '所有交易',
      announcementsTitle: '多语言银行公告管理', createAnnouncementBtn: '发布公告',
    },
  }),

  'zh-TW': createTranslations({
    common: {
      home: '首頁', history: '紀錄', notifications: '通知', settings: '設定',
      back: '返回', close: '關閉', cancel: '取消', save: '儲存', saving: '儲存中...',
      refresh: '重新整理', copy: '複製', copied: '已複製！', search: '搜尋', all: '全部',
      digitalBanking: '數位銀行',
    },
    languageModal: { title: '選擇應用程式語言', searchPlaceholder: '搜尋語言...' },
    countryModal: { title: '選擇國家 / 地區', searchPlaceholder: '搜尋國家或區號...' },
    nav: {
      home: '概覽', dashboard: '儀表板', transfer: '轉帳', withdrawal: '提領',
      history: '交易紀錄', notifications: '通知', profile: '個人資料與設定', logout: '登出',
      signIn: '登入', register: '開立帳戶', language: '語言', country: '國家',
    },
    landing: {
      welcomeBack: '歡迎回來', tagline: '安全 · 簡潔 · 可靠',
      loginWithGmail: '使用 Gmail 登入', createAccount: '建立帳戶', securityMessage: '您的安全是我們的首要任務',
    },
    dashboard: {
      helloGreeting: '您好', welcomeToAccount: '歡迎使用您的帳戶', availableBalance: '可用餘額',
      sendMoney: '匯款轉帳', receiveMoney: '收款', withdrawToBank: '提領至銀行',
      recentActivity: '近期交易', viewAll: '查看全部', moneyReceived: '已收款', moneySent: '已匯出',
      announcementsTitle: '銀行公告',
    },
    errors: { noAccountFound: '找不到已註冊的帳戶，請先建立帳戶。' },
    profile: { title: '帳戶設定與偏好', saveChanges: '儲存偏好設定', savedSuccess: '偏好設定已儲存至雲端。' },
    admin: { dashboardTitle: '管理員控制台', announcementsTab: '銀行公告' },
  }),

  ja: createTranslations({
    common: {
      home: 'ホーム', history: '履歴', notifications: '通知', settings: '設定',
      back: '戻る', close: '閉じる', cancel: 'キャンセル', save: '保存', saving: '保存中...',
      refresh: '更新', copy: 'コピー', copied: 'コピー完了！', search: '検索', all: 'すべて',
      allRightsReserved: 'All rights reserved.', digitalBanking: 'デジタルバンキング',
    },
    languageModal: { title: '表示言語を選択', searchPlaceholder: '言語を検索...' },
    countryModal: { title: '国 / 地域を選択', searchPlaceholder: '国名または国番号を検索...' },
    nav: {
      home: '概要', dashboard: 'ダッシュボード', transfer: '送金', withdrawal: '出金',
      history: '取引履歴', notifications: '通知', profile: 'プロフィールと設定', logout: 'ログアウト',
      signIn: 'ログイン', register: '口座開設', language: '言語', country: '国/地域',
    },
    landing: {
      welcomeBack: 'おかえりなさい', tagline: '安全・シンプル・信頼',
      loginWithGmail: 'Gmailでログイン', createAccount: '新規口座開設', securityMessage: 'お客様のセキュリティが最優先です',
    },
    auth: {
      signInTitle: 'Gmailでログイン', registerTitle: '口座開設', emailLabel: 'Gmailアドレス',
      passwordLabel: 'パスワード', fullNameLabel: '氏名', countryLabel: '国 / 地域', phoneLabel: '電話番号',
      submitSignIn: 'ログイン', submitRegister: 'アカウントを作成してメール認証', forgotPassword: 'パスワードをお忘れですか？',
    },
    errors: { noAccountFound: '登録されたアカウントが見つかりません。先に口座を開設してください。', invalidCredentials: 'メールアドレスまたはパスワードが正しくありません。' },
    dashboard: {
      helloGreeting: 'こんにちは', welcomeToAccount: '口座へようこそ', availableBalance: '利用可能残高',
      sendMoney: '送金する', receiveMoney: '受け取る', withdrawToBank: '銀行へ出金',
      recentActivity: '最近の取引', viewAll: 'すべて表示', moneyReceived: '入金', moneySent: '送金',
      announcementsTitle: '銀行からのお知らせ',
    },
    history: { title: '取引履歴', statusCompleted: '完了', statusPending: '保留中', noResults: '該当する取引はありません。' },
    notifications: { title: '通知', markAllRead: 'すべて既読', noNotifications: '通知はありません。', announcementsHeading: '公式お知らせ' },
    profile: { title: '設定と環境設定', saveChanges: '設定を保存', savedSuccess: '設定が保存されました。' },
    admin: { dashboardTitle: '管理者コンソール', announcementsTab: 'お知らせ' },
  }),

  ko: createTranslations({
    common: {
      home: '홈', history: '내역', notifications: '알림', settings: '설정',
      back: '뒤로', close: '닫기', cancel: '취소', save: '저장', saving: '저장 중...',
      refresh: '새로고침', copy: '복사', copied: '복사됨!', search: '검색', all: '전체',
      digitalBanking: '디지털 뱅킹',
    },
    languageModal: { title: '애플리케이션 언어 선택', searchPlaceholder: '언어 검색...' },
    countryModal: { title: '국가 / 지역 선택', searchPlaceholder: '국가명 또는 국가번호 검색...' },
    nav: {
      home: '개요', dashboard: '대시보드', transfer: '송금', withdrawal: '출금',
      history: '거래 내역', notifications: '알림', profile: '프로필 및 설정', logout: '로그아웃',
      signIn: '로그인', register: '계좌 개설', language: '언어', country: '국가',
    },
    landing: {
      welcomeBack: '다시 오신 것을 환영합니다', tagline: '안전함. 간편함. 신뢰성.',
      loginWithGmail: 'Gmail로 로그인', createAccount: '계정 만들기', securityMessage: '고객님의 보안이 최우선입니다',
    },
    auth: {
      signInTitle: 'Gmail로 로그인', registerTitle: '계정 만들기', emailLabel: 'Gmail 주소',
      passwordLabel: '비밀번호', fullNameLabel: '성명', submitSignIn: '로그인', submitRegister: '계정 생성 및 이메일 인증',
      forgotPassword: '비밀번호를 잊으셨나요?',
    },
    errors: { noAccountFound: '등록된 계정을 찾을 수 없습니다. 먼저 계정을 만들어 주세요.' },
    dashboard: {
      helloGreeting: '안녕하세요', welcomeToAccount: '계좌에 오신 것을 환영합니다', availableBalance: '사용 가능 잔액',
      sendMoney: '송금하기', receiveMoney: '입금받기', withdrawToBank: '은행으로 출금',
      recentActivity: '최근 거래', viewAll: '전체 보기', moneyReceived: '입금', moneySent: '송금',
      announcementsTitle: '은행 공지사항',
    },
    profile: { title: '계정 설정 및 환경설정', saveChanges: '설정 저장', savedSuccess: '설정이 저장되었습니다.' },
    admin: { dashboardTitle: '관리자 콘솔', announcementsTab: '공지사항' },
  }),

  vi: createTranslations({
    common: {
      home: 'Trang chủ', history: 'Lịch sử', notifications: 'Thông báo', settings: 'Cài đặt',
      back: 'Quay lại', close: 'Đóng', cancel: 'Hủy', save: 'Lưu', saving: 'Đang lưu...',
      refresh: 'Làm mới', copy: 'Sao chép', copied: 'Đã sao chép!', search: 'Tìm kiếm', all: 'Tất cả',
      digitalBanking: 'Ngân hàng Số',
    },
    languageModal: { title: 'Chọn Ngôn Ngữ', searchPlaceholder: 'Tìm ngôn ngữ...' },
    countryModal: { title: 'Chọn Quốc Gia / Khu Vực', searchPlaceholder: 'Tìm quốc gia hoặc mã vùng...' },
    nav: {
      home: 'Tổng quan', dashboard: 'Bảng điều khiển', transfer: 'Chuyển tiền', withdrawal: 'Rút tiền',
      history: 'Lịch sử giao dịch', notifications: 'Thông báo', profile: 'Hồ sơ & Cài đặt', logout: 'Đăng xuất',
      signIn: 'Đăng nhập', register: 'Mở tài khoản', language: 'Ngôn ngữ', country: 'Quốc gia',
    },
    landing: {
      welcomeBack: 'Chào mừng trở lại', tagline: 'An toàn. Đơn giản. Tin cậy.',
      loginWithGmail: 'Đăng nhập bằng Gmail', createAccount: 'Tạo Tài Khoản', securityMessage: 'Bảo mật của bạn là ưu tiên hàng đầu',
    },
    dashboard: {
      helloGreeting: 'Xin chào', welcomeToAccount: 'Chào mừng đến với tài khoản của bạn', availableBalance: 'Số dư khả dụng',
      sendMoney: 'Gửi tiền', receiveMoney: 'Nhận tiền', withdrawToBank: 'Rút về ngân hàng',
      recentActivity: 'Giao dịch gần đây', viewAll: 'Xem tất cả', moneyReceived: 'Đã nhận tiền', moneySent: 'Đã gửi tiền',
      announcementsTitle: 'Thông báo ngân hàng',
    },
    errors: { noAccountFound: 'Không tìm thấy tài khoản đã đăng ký. Vui lòng tạo tài khoản trước.' },
    profile: { title: 'Cài đặt Tài khoản', saveChanges: 'Lưu tùy chọn', savedSuccess: 'Đã lưu tùy chọn.' },
    admin: { dashboardTitle: 'Bảng điều khiển Quản trị', announcementsTab: 'Thông báo' },
  }),

  hi: createTranslations({
    common: {
      home: 'होम', history: 'इतिहास', notifications: 'सूचनाएं', settings: 'सेटिंग्स',
      back: 'वापस', close: 'बंद करें', cancel: 'रद्द करें', save: 'सहेजें', saving: 'सहेजा जा रहा है...',
      refresh: 'रीफ़्रेश', copy: 'कॉपी', copied: 'कॉपी किया गया!', search: 'खोजें', all: 'सभी',
    },
    languageModal: { title: 'ऐप भाषा चुनें', searchPlaceholder: 'भाषा खोजें...' },
    countryModal: { title: 'देश / क्षेत्र चुनें', searchPlaceholder: 'देश या डायल कोड खोजें...' },
    nav: {
      home: 'अवलोकन', dashboard: 'डैशबोर्ड', transfer: 'ट्रांसफर', withdrawal: 'निकासी',
      history: 'लेन-देन इतिहास', notifications: 'सूचनाएं', profile: 'प्रोफ़ाइल और सेटिंग्स', logout: 'लॉग आउट',
      signIn: 'लॉग इन', register: 'खाता खोलें', language: 'भाषा', country: 'देश',
    },
    landing: {
      welcomeBack: 'वापसी पर स्वागत है', tagline: 'सुरक्षित। सरल। विश्वसनीय।',
      loginWithGmail: 'Gmail से लॉग इन करें', createAccount: 'खाता बनाएं', securityMessage: 'आपकी सुरक्षा हमारी प्राथमिकता है',
    },
    dashboard: {
      helloGreeting: 'नमस्ते', welcomeToAccount: 'आपके खाते में स्वागत है', availableBalance: 'उपलब्ध शेष राशि',
      sendMoney: 'पैसे भेजें', receiveMoney: 'पैसे प्राप्त करें', withdrawToBank: 'बैंक में निकालें',
      recentActivity: 'हाल के लेन-देन', viewAll: 'सभी देखें', moneyReceived: 'धन प्राप्त हुआ', moneySent: 'धन भेजा गया',
      announcementsTitle: 'बैंक घोषणाएं',
    },
    errors: { noAccountFound: 'कोई पंजीकृत खाता नहीं मिला। कृपया पहले खाता बनाएं।' },
    profile: { title: 'खाता सेटिंग्स', saveChanges: 'प्राथमिकताएं सहेजें', savedSuccess: 'प्राथमिकताएं सहेजी गईं।' },
    admin: { dashboardTitle: 'प्रशासक कंसोल', announcementsTab: 'घोषणाएं' },
  }),

  bn: createTranslations({
    common: {
      home: 'হোম', history: 'ইতিহাস', notifications: 'বিজ্ঞপ্তি', settings: 'সেটিংস',
      back: 'ফিরে যান', close: 'বন্ধ করুন', cancel: 'বাতিল', save: 'সংরক্ষণ করুন',
      refresh: 'রিফ্রেশ', copy: 'কপি', copied: 'কপি হয়েছে!', search: 'খুঁজুন', all: 'সব',
    },
    landing: {
      welcomeBack: 'স্বাগতম', tagline: 'নিরাপদ। সহজ। বিশ্বস্ত।',
      loginWithGmail: 'Gmail দিয়ে লগইন করুন', createAccount: 'অ্যাকাউন্ট তৈরি করুন', securityMessage: 'আপনার নিরাপত্তা আমাদের অগ্রাধিকার',
    },
    dashboard: {
      helloGreeting: 'হ্যালো', welcomeToAccount: 'আপনার অ্যাকাউন্টে স্বাগতম', availableBalance: 'উপলব্ধ ব্যালেন্স',
      sendMoney: 'টাকা পাঠান', receiveMoney: 'টাকা গ্রহণ করুন', recentActivity: 'সাম্প্রতিক লেনদেন', viewAll: 'সব দেখুন',
      announcementsTitle: 'ব্যাংক ঘোষণা',
    },
    profile: { title: 'অ্যাকাউন্ট সেটিংস', saveChanges: 'পছন্দ সংরক্ষণ করুন' },
    admin: { dashboardTitle: 'অ্যাডমিন কনসোল', announcementsTab: 'ঘোষণা' },
  }),

  id: createTranslations({
    common: {
      home: 'Beranda', history: 'Riwayat', notifications: 'Notifikasi', settings: 'Pengaturan',
      back: 'Kembali', close: 'Tutup', cancel: 'Batal', save: 'Simpan', refresh: 'Segarkan',
      copy: 'Salin', copied: 'Disalin!', search: 'Cari', all: 'Semua',
    },
    landing: {
      welcomeBack: 'Selamat Datang Kembali', tagline: 'Aman. Sederhana. Terpercaya.',
      loginWithGmail: 'Masuk dengan Gmail', createAccount: 'Buat Akun', securityMessage: 'Keamanan Anda adalah prioritas kami',
    },
    dashboard: {
      helloGreeting: 'Halo', welcomeToAccount: 'Selamat datang di akun Anda', availableBalance: 'Saldo Tersedia',
      sendMoney: 'Kirim Uang', receiveMoney: 'Terima Uang', withdrawToBank: 'Tarik ke Bank',
      recentActivity: 'Transaksi Terbaru', viewAll: 'Lihat Semua', moneyReceived: 'Uang Diterima', moneySent: 'Uang Dikirim',
      announcementsTitle: 'Pengumuman Bank',
    },
    errors: { noAccountFound: 'Akun terdaftar tidak ditemukan. Silakan buat akun terlebih dahulu.' },
    profile: { title: 'Pengaturan Akun', saveChanges: 'Simpan Preferensi', savedSuccess: 'Preferensi disimpan.' },
    admin: { dashboardTitle: 'Konsol Administrator', announcementsTab: 'Pengumuman' },
  }),

  ms: createTranslations({
    common: {
      home: 'Utama', history: 'Sejarah', notifications: 'Pemberitahuan', settings: 'Tetapan',
      back: 'Kembali', close: 'Tutup', cancel: 'Batal', save: 'Simpan', refresh: 'Muat semula',
      copy: 'Salin', copied: 'Disalin!', search: 'Cari', all: 'Semua',
    },
    landing: {
      welcomeBack: 'Selamat Kembali', tagline: 'Selamat. Mudah. Dipercayai.',
      loginWithGmail: 'Log masuk dengan Gmail', createAccount: 'Cipta Akaun', securityMessage: 'Keselamatan anda keutamaan kami',
    },
    dashboard: {
      helloGreeting: 'Helo', welcomeToAccount: 'Selamat datang ke akaun anda', availableBalance: 'Baki Tersedia',
      sendMoney: 'Hantar Wang', receiveMoney: 'Terima Wang', recentActivity: 'Transaksi Terkini', viewAll: 'Lihat Semua',
      announcementsTitle: 'Pengumuman Bank',
    },
    profile: { title: 'Tetapan Akaun', saveChanges: 'Simpan Tetapan' },
    admin: { dashboardTitle: 'Konsol Pentadbir', announcementsTab: 'Pengumuman' },
  }),

  th: createTranslations({
    common: {
      home: 'หน้าหลัก', history: 'ประวัติ', notifications: 'การแจ้งเตือน', settings: 'ตั้งค่า',
      back: 'กลับ', close: 'ปิด', cancel: 'ยกเลิก', save: 'บันทึก', refresh: 'รีเฟรช',
      copy: 'คัดลอก', copied: 'คัดลอกแล้ว!', search: 'ค้นหา', all: 'ทั้งหมด',
    },
    landing: {
      welcomeBack: 'ยินดีต้อนรับกลับ', tagline: 'ปลอดภัย เรียบง่าย เชื่อถือได้',
      loginWithGmail: 'เข้าสู่ระบบด้วย Gmail', createAccount: 'สร้างบัญชี', securityMessage: 'ความปลอดภัยของคุณคือสิ่งสำคัญที่สุด',
    },
    dashboard: {
      helloGreeting: 'สวัสดี', welcomeToAccount: 'ยินดีต้อนรับสู่บัญชีของคุณ', availableBalance: 'ยอดเงินคงเหลือที่ใช้ได้',
      sendMoney: 'โอนเงิน', receiveMoney: 'รับเงิน', recentActivity: 'ธุรกรรมล่าสุด', viewAll: 'ดูทั้งหมด',
      announcementsTitle: 'ประกาศจากธนาคาร',
    },
    profile: { title: 'การตั้งค่าบัญชี', saveChanges: 'บันทึกการตั้งค่า' },
    admin: { dashboardTitle: 'คอนโซลผู้ดูแลระบบ', announcementsTab: 'ประกาศ' },
  }),

  fil: createTranslations({
    common: {
      home: 'Home', history: 'Kasaysayan', notifications: 'Mga Abiso', settings: 'Mga Setting',
      back: 'Bumalik', close: 'Isara', cancel: 'Kanselahin', save: 'I-save', refresh: 'I-refresh',
      copy: 'Kopyahin', copied: 'Nakopya!', search: 'Maghanap', all: 'Lahat',
    },
    landing: {
      welcomeBack: 'Maligayang Pagbabalik', tagline: 'Ligtas. Simple. Maaasahan.',
      loginWithGmail: 'Mag-login gamit ang Gmail', createAccount: 'Gumawa ng Account', securityMessage: 'Ang iyong seguridad ay aming priyoridad',
    },
    dashboard: {
      helloGreeting: 'Kumusta', welcomeToAccount: 'Maligayang pagdating sa iyong account', availableBalance: 'Magagamit na Balanse',
      sendMoney: 'Magpadala ng Pera', receiveMoney: 'Tumanggap ng Pera', recentActivity: 'Mga Kamakailang Transaksyon', viewAll: 'Tingnan Lahat',
      announcementsTitle: 'Mga Anunsyo ng Bangko',
    },
    profile: { title: 'Mga Setting ng Account', saveChanges: 'I-save ang mga Kagustuhan' },
    admin: { dashboardTitle: 'Console ng Administrator', announcementsTab: 'Mga Anunsyo' },
  }),
};

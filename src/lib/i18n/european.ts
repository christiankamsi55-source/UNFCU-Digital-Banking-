import { createTranslations } from './merge';
import { Translations } from './types';

export const EUROPEAN_TRANSLATIONS: Record<
  'ru' | 'uk' | 'pl' | 'el' | 'sv' | 'no' | 'da' | 'fi' | 'ro' | 'cs' | 'hu' | 'sk' | 'bg' | 'tr',
  Translations
> = {
  ru: createTranslations({
    common: {
      home: 'Главная', history: 'История', notifications: 'Уведомления', settings: 'Настройки',
      back: 'Назад', close: 'Закрыть', cancel: 'Отмена', save: 'Сохранить', saving: 'Сохранение...',
      refresh: 'Обновить', copy: 'Копировать', copied: 'Скопировано!', search: 'Поиск', all: 'Все',
      allRightsReserved: 'Все права защищены.', digitalBanking: 'Цифровой банкинг',
    },
    languageModal: { title: 'Выберите язык приложения', searchPlaceholder: 'Поиск языка...' },
    countryModal: { title: 'Выберите страну / регион', searchPlaceholder: 'Поиск страны или кода...' },
    nav: {
      home: 'Обзор', dashboard: 'Панель', transfer: 'Перевод', withdrawal: 'Вывод',
      history: 'История операций', notifications: 'Уведомления', profile: 'Профиль и настройки', logout: 'Выйти',
      signIn: 'Войти', register: 'Открыть счет', language: 'Язык', country: 'Страна',
    },
    landing: {
      welcomeBack: 'С возвращением', tagline: 'Надежно. Просто. Безопасно.',
      loginWithGmail: 'Войти через Gmail', createAccount: 'Создать аккаунт', securityMessage: 'Ваша безопасность — наш приоритет',
    },
    auth: {
      signInTitle: 'Войти через Gmail', registerTitle: 'Создать аккаунт', emailLabel: 'Адрес Gmail',
      passwordLabel: 'Пароль', fullNameLabel: 'Полное имя', submitSignIn: 'Войти в аккаунт',
      submitRegister: 'Создать аккаунт и подтвердить email', forgotPassword: 'Забыли пароль?',
    },
    errors: { noAccountFound: 'Зарегистрированный аккаунт не найден. Сначала создайте аккаунт.', invalidCredentials: 'Неверный email или пароль.' },
    dashboard: {
      helloGreeting: 'Здравствуйте', welcomeToAccount: 'Добро пожаловать в ваш аккаунт', availableBalance: 'Доступный баланс',
      sendMoney: 'Отправить', receiveMoney: 'Получить', withdrawToBank: 'Вывод в банк',
      recentActivity: 'Последние операции', viewAll: 'Смотреть все', moneyReceived: 'Получено', moneySent: 'Отправлено',
      announcementsTitle: 'Объявления банка',
    },
    history: { title: 'История транзакций', statusCompleted: 'Завершено', statusPending: 'В ожидании', noResults: 'Транзакции не найдены.' },
    notifications: { title: 'Уведомления', markAllRead: 'Отметить все прочитанными', noNotifications: 'Уведомлений нет.', announcementsHeading: 'Официальные объявления' },
    profile: { title: 'Настройки аккаунта', saveChanges: 'Сохранить настройки', savedSuccess: 'Настройки сохранены в Firestore.' },
    admin: { dashboardTitle: 'Панель администратора', announcementsTab: 'Объявления' },
  }),

  uk: createTranslations({
    common: {
      home: 'Головна', history: 'Історія', notifications: 'Сповіщення', settings: 'Налаштування',
      back: 'Назад', close: 'Закрити', cancel: 'Скасувати', save: 'Зберегти',
      refresh: 'Оновити', copy: 'Копіювати', copied: 'Скопійовано!', search: 'Пошук', all: 'Усі',
    },
    landing: {
      welcomeBack: 'З поверненням', tagline: 'Безпечно. Просто. Надійно.',
      loginWithGmail: 'Увійти з Gmail', createAccount: 'Створити акаунт', securityMessage: 'Ваша безпека — наш пріоритет',
    },
    dashboard: {
      helloGreeting: 'Вітаємо', welcomeToAccount: 'Ласкаво просимо до вашого рахунку', availableBalance: 'Доступний баланс',
      sendMoney: 'Надіслати кошти', receiveMoney: 'Отримати кошти', recentActivity: 'Останні транзакції', viewAll: 'Переглянути всі',
      announcementsTitle: 'Оголошення банку',
    },
    errors: { noAccountFound: 'Зареєстрований акаунт не знайдено. Спочатку створіть акаунт.' },
    profile: { title: 'Налаштування рахунку', saveChanges: 'Зберегти налаштування' },
    admin: { dashboardTitle: 'Консоль адміністратора', announcementsTab: 'Оголошення' },
  }),

  pl: createTranslations({
    common: {
      home: 'Start', history: 'Historia', notifications: 'Powiadomienia', settings: 'Ustawienia',
      back: 'Wstecz', close: 'Zamknij', cancel: 'Anuluj', save: 'Zapisz',
      refresh: 'Odśwież', copy: 'Kopiuj', copied: 'Skopiowano!', search: 'Szukaj', all: 'Wszystkie',
    },
    landing: {
      welcomeBack: 'Witamy ponownie', tagline: 'Bezpiecznie. Prosto. Niezawodnie.',
      loginWithGmail: 'Zaloguj przez Gmail', createAccount: 'Utwórz konto', securityMessage: 'Twoje bezpieczeństwo jest naszym priorytetem',
    },
    dashboard: {
      helloGreeting: 'Witaj', welcomeToAccount: 'Witamy na Twoim koncie', availableBalance: 'Dostępne saldo',
      sendMoney: 'Wyślij pieniądze', receiveMoney: 'Odbierz pieniądze', recentActivity: 'Ostatnie transakcje', viewAll: 'Zobacz wszystkie',
      announcementsTitle: 'Komunikaty banku',
    },
    profile: { title: 'Ustawienia konta', saveChanges: 'Zapisz preferencje' },
    admin: { dashboardTitle: 'Konsola Administratora', announcementsTab: 'Komunikaty' },
  }),

  el: createTranslations({
    common: {
      home: 'Αρχική', history: 'Ιστορικό', notifications: 'Ειδοποιήσεις', settings: 'Ρυθμίσεις',
      back: 'Πίσω', close: 'Κλείσιμο', cancel: 'Ακύρωση', save: 'Αποθήκευση',
      refresh: 'Ανανέωση', copy: 'Αντιγραφή', copied: 'Αντιγράφηκε!', search: 'Αναζήτηση', all: 'Όλα',
    },
    landing: {
      welcomeBack: 'Καλώς ορίσατε πίσω', tagline: 'Ασφαλές. Απλό. Αξιόπιστο.',
      loginWithGmail: 'Σύνδεση με Gmail', createAccount: 'Δημιουργία Λογαριασμού', securityMessage: 'Η ασφάλειά σας είναι προτεραιότητά μας',
    },
    dashboard: {
      helloGreeting: 'Γεια σας', availableBalance: 'Διαθέσιμο Υπόλοιπο', sendMoney: 'Αποστολή χρημάτων',
      receiveMoney: 'Λήψη χρημάτων', recentActivity: 'Πρόσφατες συναλλαγές', viewAll: 'Προβολή όλων', announcementsTitle: 'Ανακοινώσεις Τράπεζας',
    },
    profile: { title: 'Ρυθμίσεις Λογαριασμού', saveChanges: 'Αποθήκευση' },
    admin: { dashboardTitle: 'Κονσόλα Διαχειριστή', announcementsTab: 'Ανακοινώσεις' },
  }),

  sv: createTranslations({
    common: {
      home: 'Hem', history: 'Historik', notifications: 'Aviseringar', settings: 'Inställningar',
      back: 'Tillbaka', close: 'Stäng', cancel: 'Avbryt', save: 'Spara',
      refresh: 'Uppdatera', copy: 'Kopiera', copied: 'Kopierad!', search: 'Sök', all: 'Alla',
    },
    landing: {
      welcomeBack: 'Välkommen tillbaka', tagline: 'Säkert. Enkelt. Pålitligt.',
      loginWithGmail: 'Logga in med Gmail', createAccount: 'Skapa konto', securityMessage: 'Din säkerhet är vår prioritet',
    },
    dashboard: {
      helloGreeting: 'Hej', availableBalance: 'Tillgängligt saldo', sendMoney: 'Skicka pengar',
      receiveMoney: 'Ta emot pengar', recentActivity: 'Senaste transaktioner', viewAll: 'Visa alla', announcementsTitle: 'Bankmeddelanden',
    },
    profile: { title: 'Kontoinställningar', saveChanges: 'Spara inställningar' },
    admin: { dashboardTitle: 'Administratörskonsol', announcementsTab: 'Meddelanden' },
  }),

  no: createTranslations({
    common: {
      home: 'Hjem', history: 'Historikk', notifications: 'Varsler', settings: 'Innstillinger',
      back: 'Tilbake', close: 'Lukk', cancel: 'Avbryt', save: 'Lagre',
      refresh: 'Oppdater', copy: 'Kopier', copied: 'Kopiert!', search: 'Søk', all: 'Alle',
    },
    landing: {
      welcomeBack: 'Velkommen tilbake', tagline: 'Sikkert. Enkelt. Pålitelig.',
      loginWithGmail: 'Logg inn med Gmail', createAccount: 'Opprett konto', securityMessage: 'Din sikkerhet er vår prioritet',
    },
    dashboard: {
      helloGreeting: 'Hei', availableBalance: 'Tilgjengelig saldo', sendMoney: 'Send penger',
      receiveMoney: 'Motta penger', recentActivity: 'Siste transaksjoner', viewAll: 'Vis alle', announcementsTitle: 'Bankkunngjøringer',
    },
    profile: { title: 'Kontoinnstillinger', saveChanges: 'Lagre innstillinger' },
    admin: { dashboardTitle: 'Administratorkonsoll', announcementsTab: 'Kunngjøringer' },
  }),

  da: createTranslations({
    common: {
      home: 'Hjem', history: 'Historik', notifications: 'Notifikationer', settings: 'Indstillinger',
      back: 'Tilbage', close: 'Luk', cancel: 'Annuller', save: 'Gem',
      refresh: 'Opdater', copy: 'Kopiér', copied: 'Kopieret!', search: 'Søg', all: 'Alle',
    },
    landing: {
      welcomeBack: 'Velkommen tilbage', tagline: 'Sikker. Enkel. Pålidelig.',
      loginWithGmail: 'Log ind med Gmail', createAccount: 'Opret konto', securityMessage: 'Din sikkerhed er vores prioritet',
    },
    dashboard: {
      helloGreeting: 'Hej', availableBalance: 'Tilgængelig saldo', sendMoney: 'Send penge',
      receiveMoney: 'Modtag penge', recentActivity: 'Seneste transaktioner', viewAll: 'Se alle', announcementsTitle: 'Bankmeddelelser',
    },
    profile: { title: 'Kontoindstillinger', saveChanges: 'Gem indstillinger' },
    admin: { dashboardTitle: 'Administratorkonsol', announcementsTab: 'Meddelelser' },
  }),

  fi: createTranslations({
    common: {
      home: 'Etusivu', history: 'Historia', notifications: 'Ilmoitukset', settings: 'Asetukset',
      back: 'Takaisin', close: 'Sulje', cancel: 'Peruuta', save: 'Tallenna',
      refresh: 'Päivitä', copy: 'Kopioi', copied: 'Kopioitu!', search: 'Hae', all: 'Kaikki',
    },
    landing: {
      welcomeBack: 'Tervetuloa takaisin', tagline: 'Turvallinen. Yksinkertainen. Luotettava.',
      loginWithGmail: 'Kirjaudu Gmaililla', createAccount: 'Luo tili', securityMessage: 'Turvallisuutesi on etusijalla',
    },
    dashboard: {
      helloGreeting: 'Hei', availableBalance: 'Käytettävissä oleva saldo', sendMoney: 'Lähetä rahaa',
      receiveMoney: 'Vastaanota rahaa', recentActivity: 'Viimeisimmät tapahtumat', viewAll: 'Näytä kaikki', announcementsTitle: 'Pankin tiedotteet',
    },
    profile: { title: 'Tiliasetukset', saveChanges: 'Tallenna asetukset' },
    admin: { dashboardTitle: 'Ylläpitokonsoli', announcementsTab: 'Tiedotteet' },
  }),

  ro: createTranslations({
    common: {
      home: 'Acasă', history: 'Istoric', notifications: 'Notificări', settings: 'Setări',
      back: 'Înapoi', close: 'Închide', cancel: 'Anulează', save: 'Salvează',
      refresh: 'Reîmprospătează', copy: 'Copiază', copied: 'Copiat!', search: 'Caută', all: 'Toate',
    },
    landing: {
      welcomeBack: 'Bine ai revenit', tagline: 'Sigur. Simplu. De încredere.',
      loginWithGmail: 'Autentificare cu Gmail', createAccount: 'Creează cont', securityMessage: 'Securitatea dumneavoastră este prioritatea noastră',
    },
    dashboard: {
      helloGreeting: 'Bună', availableBalance: 'Sold disponibil', sendMoney: 'Trimite bani',
      receiveMoney: 'Primește bani', recentActivity: 'Tranzacții recente', viewAll: 'Vezi tot', announcementsTitle: 'Anunțuri bancare',
    },
    profile: { title: 'Setări cont', saveChanges: 'Salvează preferințele' },
    admin: { dashboardTitle: 'Consolă Administrator', announcementsTab: 'Anunțuri' },
  }),

  cs: createTranslations({
    common: {
      home: 'Domů', history: 'Historie', notifications: 'Oznámení', settings: 'Nastavení',
      back: 'Zpět', close: 'Zavřít', cancel: 'Zrušit', save: 'Uložit',
      refresh: 'Obnovit', copy: 'Kopírovat', copied: 'Zkopírováno!', search: 'Hledat', all: 'Vše',
    },
    landing: {
      welcomeBack: 'Vítejte zpět', tagline: 'Bezpečné. Jednoduché. Spolehlivé.',
      loginWithGmail: 'Přihlásit přes Gmail', createAccount: 'Vytvořit účet', securityMessage: 'Vaše bezpečnost je naší prioritou',
    },
    dashboard: {
      helloGreeting: 'Dobrý den', availableBalance: 'Dostupný zůstatek', sendMoney: 'Odeslat peníze',
      receiveMoney: 'Přijmout peníze', recentActivity: 'Nedávné transakce', viewAll: 'Zobrazit vše', announcementsTitle: 'Oznámení banky',
    },
    profile: { title: 'Nastavení účtu', saveChanges: 'Uložit předvolby' },
    admin: { dashboardTitle: 'Administrátorská konzole', announcementsTab: 'Oznámení' },
  }),

  hu: createTranslations({
    common: {
      home: 'Kezdőlap', history: 'Előzmények', notifications: 'Értesítések', settings: 'Beállítások',
      back: 'Vissza', close: 'Bezárás', cancel: 'Mégse', save: 'Mentés',
      refresh: 'Frissítés', copy: 'Másolás', copied: 'Másolva!', search: 'Keresés', all: 'Összes',
    },
    landing: {
      welcomeBack: 'Üdvözöljük újra', tagline: 'Biztonságos. Egyszerű. Megbízható.',
      loginWithGmail: 'Bejelentkezés Gmaillel', createAccount: 'Fiók létrehozása', securityMessage: 'Az Ön biztonsága az elsődleges számunkra',
    },
    dashboard: {
      helloGreeting: 'Üdvözöljük', availableBalance: 'Elérhető egyenleg', sendMoney: 'Pénzküldés',
      receiveMoney: 'Pénz fogadása', recentActivity: 'Legutóbbi tranzakciók', viewAll: 'Összes megtekintése', announcementsTitle: 'Banki közlemények',
    },
    profile: { title: 'Fiókbeállítások', saveChanges: 'Beállítások mentése' },
    admin: { dashboardTitle: 'Adminisztrátori konzol', announcementsTab: 'Közlemények' },
  }),

  sk: createTranslations({
    common: {
      home: 'Domov', history: 'História', notifications: 'Oznámenia', settings: 'Nastavenia',
      back: 'Späť', close: 'Zavrieť', cancel: 'Zrušiť', save: 'Uložiť',
      refresh: 'Obnoviť', copy: 'Kopírovať', copied: 'Skopírované!', search: 'Hľadať', all: 'Všetko',
    },
    landing: {
      welcomeBack: 'Vitajte späť', tagline: 'Bezpečné. Jednoduché. Spoľahlivé.',
      loginWithGmail: 'Prihlásiť sa cez Gmail', createAccount: 'Vytvoriť účet',
    },
    dashboard: {
      helloGreeting: 'Dobrý deň', availableBalance: 'Dostupný zostatok', sendMoney: 'Poslať peniaze',
      receiveMoney: 'Prijať peniaze', recentActivity: 'Nedávne transakcie', viewAll: 'Zobraziť všetko',
    },
    profile: { title: 'Nastavenia účtu', saveChanges: 'Uložiť nastavenia' },
    admin: { dashboardTitle: 'Konzola správcu', announcementsTab: 'Oznámenia' },
  }),

  bg: createTranslations({
    common: {
      home: 'Начало', history: 'История', notifications: 'Известия', settings: 'Настройки',
      back: 'Назад', close: 'Затвори', cancel: 'Отказ', save: 'Запази',
      refresh: 'Обнови', copy: 'Копирай', copied: 'Копирано!', search: 'Търсене', all: 'Всички',
    },
    landing: {
      welcomeBack: 'Добре дошли отново', tagline: 'Сигурно. Лесно. Надеждно.',
      loginWithGmail: 'Вход с Gmail', createAccount: 'Създаване на акаунт',
    },
    dashboard: {
      helloGreeting: 'Здравейте', availableBalance: 'Наличен баланс', sendMoney: 'Изпрати пари',
      receiveMoney: 'Получи пари', recentActivity: 'Последни транзакции', viewAll: 'Виж всички',
    },
    profile: { title: 'Настройки на акаунта', saveChanges: 'Запази настройките' },
    admin: { dashboardTitle: 'Администраторска конзола', announcementsTab: 'Съобщения' },
  }),

  tr: createTranslations({
    common: {
      home: 'Ana Sayfa', history: 'Geçmiş', notifications: 'Bildirimler', settings: 'Ayarlar',
      back: 'Geri', close: 'Kapat', cancel: 'İptal', save: 'Kaydet', saving: 'Kaydediliyor...',
      refresh: 'Yenile', copy: 'Kopyala', copied: 'Kopyalandı!', search: 'Ara', all: 'Tümü',
      digitalBanking: 'Dijital Bankacılık',
    },
    languageModal: { title: 'Uygulama Dilini Seçin', searchPlaceholder: 'Dil ara...' },
    countryModal: { title: 'Ülke / Bölge Seçin', searchPlaceholder: 'Ülke veya alan kodu ara...' },
    nav: {
      home: 'Genel Bakış', dashboard: 'Panel', transfer: 'Transfer', withdrawal: 'Para Çekme',
      history: 'İşlem Geçmişi', notifications: 'Bildirimler', profile: 'Profil ve Ayarlar', logout: 'Çıkış Yap',
      signIn: 'Giriş Yap', register: 'Hesap Aç', language: 'Dil', country: 'Ülke',
    },
    landing: {
      welcomeBack: 'Tekrar Hoş Geldiniz', tagline: 'Güvenli. Basit. Güvenilir.',
      loginWithGmail: 'Gmail ile Giriş Yap', createAccount: 'Hesap Oluştur', securityMessage: 'Güvenliğiniz önceliğimizdir',
    },
    dashboard: {
      helloGreeting: 'Merhaba', welcomeToAccount: 'Hesabınıza hoş geldiniz', availableBalance: 'Kullanılabilir Bakiye',
      sendMoney: 'Para Gönder', receiveMoney: 'Para Al', withdrawToBank: 'Bankaya Çek',
      recentActivity: 'Son İşlemler', viewAll: 'Tümünü Gör', moneyReceived: 'Gelen Para', moneySent: 'Gönderilen Para',
      announcementsTitle: 'Banka Duyuruları',
    },
    errors: { noAccountFound: 'Kayıtlı hesap bulunamadı. Lütfen önce bir hesap oluşturun.' },
    profile: { title: 'Hesap Ayarları ve Tercihler', saveChanges: 'Tercihleri Kaydet', savedSuccess: 'Tercihler kaydedildi.' },
    admin: { dashboardTitle: 'Yönetici Konsolu', announcementsTab: 'Duyurular' },
  }),
};

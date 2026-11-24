import React, { useState } from 'react';
import { useDevice } from '../../context/DeviceContext';
import { useAuth } from '../../context/AuthContext';
import { UnfcuEmblem } from '../common/UnfcuLogo';
import { getLanguageOption } from '../../lib/i18n';
import { LanguageSelectModal } from '../common/LanguageSelectModal';
import { CustomerInfoModal, InfoModalTopic } from '../common/CustomerInfoModal';
import eliteCardImg from '../../assets/images/elite_card_ref.jpg';
import azureCardImg from '../../assets/images/azure_card_ref.jpg';
import applyCardsPromoImg from '../../assets/images/apply_cards_promo_ref.jpg';
import {
  ArrowRight,
  ChevronDown,
  CreditCard,
  Globe,
  Menu,
  X,
} from 'lucide-react';

interface CardDetailModalState {
  name: string;
  tagline: string;
  bullets: string[];
  image: string;
}

export const CreditCardsPage: React.FC = () => {
  const { setActivePage } = useDevice();
  const { isAuthenticated, isAdmin, language, setLanguage } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<InfoModalTopic | null>(null);
  const [selectedCardDetail, setSelectedCardDetail] = useState<CardDetailModalState | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const currentLang = getLanguageOption(language);

  const handleApplyToday = () => {
    setMobileMenuOpen(false);
    if (isAuthenticated) {
      setActivePage(isAdmin ? 'admin_dashboard' : 'dashboard');
    } else {
      setActivePage('landing');
    }
  };

  const goToDigitalBankingWelcome = () => {
    setMobileMenuOpen(false);
    setActivePage('landing');
  };

  const scrollToDisclosures = () => {
    const el = document.getElementById('credit-card-disclosures');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#16364D] font-sans overflow-x-hidden">
      {/* ===================================================================== */}
      {/* SITE TOP NAVIGATION BAR (Matches Public Website Chrome)               */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="border-b border-slate-100 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-9 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-medium text-slate-600">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-6">
              <button
                type="button"
                onClick={() => setActivePage('public_home')}
                className="hover:text-[#16364D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => setActiveTopic('contact_us')}
                className="hover:text-[#16364D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Contact Us
              </button>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <button
                type="button"
                onClick={scrollToDisclosures}
                className="hover:text-[#16364D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Disclosures
              </button>
              <button
                type="button"
                onClick={() => setIsLangModalOpen(true)}
                className="inline-flex items-center gap-1 hover:text-[#16364D] whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="Select Language"
              >
                <Globe className="w-3 h-3 text-[#1C6DD0]" />
                <span>{currentLang.code.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 lg:gap-8 min-w-0">
            <button
              type="button"
              onClick={() => setActivePage('public_home')}
              className="flex items-center gap-2.5 text-left shrink-0 cursor-pointer group"
            >
              <UnfcuEmblem variant="navy" size={34} className="shrink-0" />
              <span className="text-xl sm:text-[22px] font-extrabold tracking-tight text-[#16364D] whitespace-nowrap">
                UNFCU<sup className="text-[10px] font-bold text-[#1C6DD0] ml-0.5">®</sup>
              </span>
            </button>

            <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-[#16364D]">
              <button
                type="button"
                onClick={() => setActivePage('public_home')}
                className="hover:text-[#1C6DD0] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-[#1C6DD0] font-semibold border-b-2 border-[#1C6DD0] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
              >
                Credit Cards
              </button>
              <button
                type="button"
                onClick={goToDigitalBankingWelcome}
                className="hover:text-[#1C6DD0] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
              >
                Digital Banking
              </button>
              <button
                type="button"
                onClick={() => setActivePage('support')}
                className="hover:text-[#1C6DD0] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
              >
                Help Center
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={goToDigitalBankingWelcome}
              className="hidden sm:inline-flex items-center gap-1 px-4 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-[#16364D] font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Join</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              type="button"
              onClick={goToDigitalBankingWelcome}
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-[#1C6DD0] hover:bg-[#1559AE] text-white font-semibold text-xs shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{isAuthenticated ? 'Banking Portal' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
              className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 text-[#16364D] hover:bg-slate-50 flex items-center justify-center cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 text-xs font-semibold text-[#16364D] shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setActivePage('public_home');
              }}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 flex items-center justify-between cursor-pointer"
            >
              <span>Overview</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-left py-2.5 px-3 rounded-lg bg-[#EBF2FC] text-[#1C6DD0] flex items-center justify-between cursor-pointer"
            >
              <span>Credit Cards</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1C6DD0]" />
            </button>
            <button
              type="button"
              onClick={goToDigitalBankingWelcome}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 flex items-center justify-between cursor-pointer"
            >
              <span>Digital Banking</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setActivePage('support');
              }}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 flex items-center justify-between cursor-pointer"
            >
              <span>Help Center</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={goToDigitalBankingWelcome}
                className="flex-1 py-2.5 px-4 rounded-full border border-slate-300 text-[#16364D] font-bold text-center cursor-pointer"
              >
                Join
              </button>
              <button
                type="button"
                onClick={goToDigitalBankingWelcome}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#1C6DD0] text-white font-bold text-center cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ===================================================================== */}
      {/* 1. TOP INTRODUCTORY HEADING & TWO CREDIT CARDS SECTION                */}
      {/* ===================================================================== */}
      <section className="bg-gradient-to-b from-[#F4F7FA] via-[#F7F9FC] to-[#FFFFFF] pt-8 sm:pt-12 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Top Heading & Intro Copy */}
          <div className="space-y-3 pb-8 sm:pb-10">
            <h1 className="text-3xl sm:text-[38px] font-bold tracking-tight text-[#16364D] leading-tight">
              Credit Cards
            </h1>
            <p
              className="text-2xl sm:text-[34px] font-normal text-[#16364D] leading-[1.2]"
              style={{ textWrap: 'balance' }}
            >
              Secure purchases,
              <br />
              global rewards
            </p>
            <p className="text-[13px] sm:text-sm text-[#334E68] pt-1">
              Start with 0.00% APR on purchases and balance transfers
            </p>
          </div>

          {/* Two Credit Card Sections Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-7 items-stretch">
            {/* CARD 1: ELITE CARD */}
            <article className="bg-white border border-slate-200/80 shadow-xs rounded-xs overflow-hidden flex flex-col">
              <div className="w-full h-48 sm:h-52 bg-[#D6D8DA] overflow-hidden shrink-0">
                {!imgErrors.elite ? (
                  <img
                    src={eliteCardImg}
                    alt="UNFCU Elite Visa Signature credit card"
                    referrerPolicy="no-referrer"
                    onError={() => setImgErrors((prev) => ({ ...prev, elite: true }))}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#16364D] text-white p-6">
                    <CreditCard className="w-8 h-8 mb-2 text-blue-200" />
                    <span className="text-sm font-semibold">UNFCU Elite Card</span>
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <h2 className="text-xl sm:text-[22px] font-normal text-[#16364D]">
                    Elite card
                  </h2>
                  <p className="text-[13px] sm:text-sm text-[#334E68] leading-relaxed">
                    Global rewards and protection with $0 foreign transaction fees
                  </p>

                  <ul className="space-y-2.5 pt-1 text-[12px] sm:text-[13px] text-[#334E68] leading-snug">
                    <li className="flex items-start gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full border border-[#627D98] mt-1.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        10,000 bonus points when you spend $2,000 in the first four months
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full border border-[#627D98] mt-1.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Zero foreign transaction fees</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full border border-[#627D98] mt-1.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Access to over 1,400 airport lounges worldwide</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-8 flex flex-col items-start gap-2.5">
                  <button
                    type="button"
                    onClick={handleApplyToday}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1C6DD0] hover:bg-[#1559AE] text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>Apply today</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCardDetail({
                        name: 'Elite card',
                        tagline: 'Global rewards and protection with $0 foreign transaction fees',
                        bullets: [
                          '10,000 bonus points when you spend $2,000 in the first four months',
                          'Zero foreign transaction fees',
                          'Access to over 1,400 airport lounges worldwide',
                        ],
                        image: eliteCardImg,
                      })
                    }
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#16364D]/60 bg-white hover:bg-slate-50 text-[#16364D] text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>Learn more</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>

            {/* CARD 2: AZURE CARD */}
            <article className="bg-white border border-slate-200/80 shadow-xs rounded-xs overflow-hidden flex flex-col">
              <div className="w-full h-48 sm:h-52 bg-[#D6D8DA] overflow-hidden shrink-0">
                {!imgErrors.azure ? (
                  <img
                    src={azureCardImg}
                    alt="UNFCU Azure Visa credit card"
                    referrerPolicy="no-referrer"
                    onError={() => setImgErrors((prev) => ({ ...prev, azure: true }))}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#1C6DD0] text-white p-6">
                    <CreditCard className="w-8 h-8 mb-2 text-blue-100" />
                    <span className="text-sm font-semibold">UNFCU Azure Card</span>
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <h2 className="text-xl sm:text-[22px] font-normal text-[#16364D]">
                    Azure card
                  </h2>
                  <p className="text-[13px] sm:text-sm text-[#334E68] leading-relaxed">
                    Reward points and security for everyday purchases with no annual fee
                  </p>

                  <ul className="space-y-2.5 pt-1 text-[12px] sm:text-[13px] text-[#334E68] leading-snug">
                    <li className="flex items-start gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full border border-[#627D98] mt-1.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        10,000 bonus points when you spend $2,000 in the first four months
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full border border-[#627D98] mt-1.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>$0 annual fee</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full border border-[#627D98] mt-1.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Price, return, and cell phone protection</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-8 flex flex-col items-start gap-2.5">
                  <button
                    type="button"
                    onClick={handleApplyToday}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1C6DD0] hover:bg-[#1559AE] text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>Apply today</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCardDetail({
                        name: 'Azure card',
                        tagline: 'Reward points and security for everyday purchases with no annual fee',
                        bullets: [
                          '10,000 bonus points when you spend $2,000 in the first four months',
                          '$0 annual fee',
                          'Price, return, and cell phone protection',
                        ],
                        image: azureCardImg,
                      })
                    }
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#16364D]/60 bg-white hover:bg-slate-50 text-[#16364D] text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>Learn more</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 2. APPLICATION SECTION (DARK NAVY BANNER WITH TWO-CARD IMAGE)         */}
      {/* ===================================================================== */}
      <section className="bg-[#1D3F5A] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 items-center gap-6 sm:gap-8">
          <div className="md:col-span-5 py-10 sm:py-14 space-y-4">
            <h2
              className="text-2xl sm:text-[28px] font-normal text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Apply for a UNFCU credit card
            </h2>
            <p className="text-[13px] sm:text-sm text-blue-100/90 leading-relaxed max-w-xs">
              Check the status of your application at any time using Digital Banking.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleApplyToday}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1C6DD0] hover:bg-[#1559AE] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <span>Apply today</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="md:col-span-7 flex justify-center md:justify-end">
            <div className="w-full max-w-[440px] bg-[#1D3F5A] overflow-hidden">
              {!imgErrors.promo ? (
                <img
                  src={applyCardsPromoImg}
                  alt="UNFCU Elite and Azure credit cards"
                  referrerPolicy="no-referrer"
                  onError={() => setImgErrors((prev) => ({ ...prev, promo: true }))}
                  className="w-full h-auto object-contain block"
                />
              ) : (
                <div className="h-56 flex items-center justify-center text-blue-100 text-xs">
                  UNFCU Elite &amp; Azure Credit Cards
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. DISCLOSURES — AT THE VERY BOTTOM                                   */}
      {/* ===================================================================== */}
      <section
        id="credit-card-disclosures"
        className="bg-[#EEF3F8] py-12 sm:py-16 px-4 sm:px-6 lg:px-8 flex-1"
      >
        <div className="max-w-5xl mx-auto text-[#2B3E50] space-y-3.5 text-[11px] sm:text-xs leading-relaxed">
          <h2 className="text-xl sm:text-2xl font-bold text-[#16364D] pb-1">
            Disclosures
          </h2>

          <p>
            * When you use your credit card, you borrow the money to pay for your purchase. There is a
            maximum amount you can owe on your credit card at any one time. This maximum is your
            credit limit. Each month, you need to make a minimum payment by a due date. You may repay
            the amount you borrowed in full. You may also choose to pay less than the full amount. You
            will pay interest on any amount you still owe after the due date. Every credit card
            payment you make replenishes your available credit.
          </p>

          <p>
            APR = Annual Percentage Rate. Creditworthiness and loan amount will determine actual APR.
            Introductory rate quoted for credit cards is for the first six months for Elite and the
            first 12 months for Azure. It is only applicable to new accounts. Thereafter, the rate will
            vary with the market based on the Prime Rate. Your actual APR may be lower than the US
            Prime plus margin if the rate is subject to regulatory limits.
          </p>

          <p>
            Visa’s Zero Liability Policy covers US-issued cards and does not apply to certain
            commercial card transactions. Visa’s Zero Liability Policy does not apply to any
            transactions not processed by Visa. You must notify UNFCU immediately of any unauthorized
            use. For specific restrictions, limitations, and other details, contact us.
          </p>

          <p>
            Earn 10,000 bonus points when you spend $2,000 on purchases in the first four months from
            account opening. (10,000 points = $100)
          </p>

          <p>
            Creditworthiness and loan amount will determine actual APR. The APR is subject to change
            at any time.
          </p>

          <p>
            Point values vary based on type of purchase. View details.
          </p>

          <p>
            Purchases that will incur foreign transaction fees include transactions made in the US
            with a foreign merchant (such as through a merchant’s website).
          </p>

          <p>
            Price protection allows cardholders to get reimbursed the difference if an item that they
            purchase appears in a print advertisement at a lower price within 60 days of purchase.
            Price protection is available to cardholders who make a purchase of up to $250 with their
            UNFCU Azure card. Additional limitations may apply.
          </p>

          <p>
            See terms for Elite (PDF) and Azure (PDF).
          </p>

          <p>
            Return protection allows cardholders to get reimbursed if they become dissatisfied with a
            purchase within 90 days and the merchant will not accept it back. Return protection is
            available to cardholders who make a purchase of up to $250 with their UNFCU Azure card.
            Additional limitations may apply.
          </p>

          <p>
            Cell phone protection allows cardholders to get reimbursed if their cell phone is lost or
            stolen with a $50.00 deductible. Cell phone protection is available to cardholders who
            charge their qualifying monthly cell phone bills to their UNFCU Azure credit card. Not
            all cellular phone plans are eligible. Additional limitations may apply.
          </p>

          <p>
            The amounts listed represent the maximum credit limit for that card for qualified members
            in an eligible country. Your approved loan amount could be less than the amount you
            requested due to a number of factors. All applicants are subject to credit approval. The
            total amount of unsecured loans for members without a home loan cannot exceed $150,000.
            This individual maximum includes unused lines of credit. The maximum amount can be
            extended to $225,000 if you have or are applying for one of our international home loans.
            UNA-USA or KI USA members with a UNFCU US mortgage may apply for consumer loans, credit
            cards, or a line of credit. All other members who joined via UNA-USA or KI USA must be a
            member for 12 months before applying for consumer loans, credit cards, or a line of
            credit. Applicants with less than one (1) year of UNFCU membership or UN employment can
            qualify for a maximum credit limit of $10,000. All other terms and fees (PDF) for UNFCU
            credit cards apply to all cardholders.
          </p>

          <p>
            Apple and Apple Pay are trademarks of Apple Inc., registered in the US and other
            countries. Google Pay is a trademark of Google LLC. Samsung and Samsung Pay are trademarks
            or registered trademarks of Samsung Electronics Co., Ltd.
          </p>
        </div>
      </section>

      {/* Learn More Card Detail Dialog */}
      {selectedCardDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#16364D] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">UNFCU {selectedCardDetail.name}</h3>
              <button
                type="button"
                onClick={() => setSelectedCardDetail(null)}
                aria-label="Close"
                className="p-1.5 rounded-lg hover:bg-white/10 text-blue-100 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs text-[#334E68] leading-relaxed">
              <div className="w-full h-36 bg-[#D6D8DA] rounded-lg overflow-hidden">
                <img
                  src={selectedCardDetail.image}
                  alt={selectedCardDetail.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <p className="font-medium text-[#16364D] text-sm">{selectedCardDetail.tagline}</p>
              <ul className="space-y-2">
                {selectedCardDetail.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span
                      className="w-2 h-2 rounded-full border border-[#627D98] mt-1 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCardDetail(null);
                    handleApplyToday();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-full bg-[#1C6DD0] hover:bg-[#1559AE] text-white font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <span>Apply today</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCardDetail(null);
                    scrollToDisclosures();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-full border border-slate-300 text-[#16364D] hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Disclosures
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CustomerInfoModal topic={activeTopic} onClose={() => setActiveTopic(null)} />

      <LanguageSelectModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        selectedLanguage={language}
        onSelectLanguage={setLanguage}
        theme="light"
      />
    </div>
  );
};

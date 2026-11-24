export const WHATSAPP_DISPLAY_NUMBER = '+1 (208) 679-6163';
export const WHATSAPP_CHAT_BASE_URL = 'https://wa.me/18026796163';

export const WHATSAPP_JOIN_URL =
  `${WHATSAPP_CHAT_BASE_URL}?text=` +
  encodeURIComponent(
    'Hello, I would like to learn more about joining Gold Chase Bank. Please provide information about membership eligibility and the official enrollment process.'
  );

export const WHATSAPP_CONTACT_URL =
  `${WHATSAPP_CHAT_BASE_URL}?text=` +
  encodeURIComponent(
    'Hello, I would like to speak with UNFCU Customer Support for assistance with my banking inquiry.'
  );

export const WHATSAPP_MODAL_CTA_LABEL = `Chat on WhatsApp · ${WHATSAPP_DISPLAY_NUMBER}`;

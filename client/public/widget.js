(function() {
  'use strict';
  
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot-id');
  const shouldAutoOpen = script.getAttribute('data-auto-open') === 'true';
  const openDelayMs = Math.max(0, parseInt(script.getAttribute('data-open-delay') || '0', 10) || 0);
  const hideMobile = script.getAttribute('data-hide-mobile') === 'true';
  const ENABLE_ELEVENLABS_VOICE = false;
  
  if (!chatbotId) {
    console.error('ChatBot Widget: Missing data-chatbot-id attribute');
    return;
  }
  
  let scriptUrl;
  try {
    scriptUrl = new URL(script.src);
  } catch (_error) {
    console.error('ChatBot Widget: Invalid script URL');
    return;
  }

  // URL.origin deliberately excludes the filename, path and cache-busting query string.
  const baseUrl = scriptUrl.origin;
  const widgetApiUrl = function(path) {
    return new URL(path, baseUrl).href;
  };
  
  const styles = document.createElement('style');
  styles.textContent = `
    .chatbot-widget-button {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 9999;
    }
    .chatbot-widget-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    .chatbot-widget-button svg {
      width: 24px;
      height: 24px;
    }
    .chatbot-widget-button-avatar-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
    .chatbot-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 384px;
      height: min(600px, calc(100vh - 48px));
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      z-index: 9999;
      display: none;
      flex-direction: column;
      background: #fff;
      font-family: 'Lufga', 'Montserrat', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --chatbot-widget-text: 14px;
      --chatbot-widget-small: 12px;
      --chatbot-widget-label: 13px;
      --chatbot-widget-title: 18px;
      --chatbot-widget-heading-1: 18px;
      --chatbot-widget-heading-2: 16px;
      --chatbot-widget-heading-3: 15px;
    }
    .chatbot-widget-container.open {
      display: flex;
    }
    .chatbot-widget-header {
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .chatbot-widget-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .chatbot-widget-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.2);
    }
    .chatbot-widget-avatar svg {
      width: 20px;
      height: 20px;
    }
    .chatbot-widget-avatar-img,
    .chatbot-widget-message-avatar-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
    .chatbot-widget-name {
      font-weight: 600;
      font-size: var(--chatbot-widget-text);
      line-height: 1.25;
    }
    .chatbot-widget-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--chatbot-widget-small);
      opacity: 0.8;
    }
    .chatbot-widget-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
    }
    .chatbot-widget-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .chatbot-widget-close:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .chatbot-widget-close svg {
      width: 20px;
      height: 20px;
    }
    .chatbot-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .chatbot-widget-message {
      display: flex;
      gap: 12px;
      max-width: 85%;
    }
    .chatbot-widget-message.user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }
    .chatbot-widget-message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .chatbot-widget-message-avatar svg {
      width: 16px;
      height: 16px;
    }
    .chatbot-widget-message-bubble {
      padding: 10px 14px;
      border-radius: 16px;
      font-size: var(--chatbot-widget-text);
      line-height: 1.5;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .chatbot-widget-message.bot .chatbot-widget-message-bubble {
      background: #f1f5f9;
      color: #1e293b;
      border-top-left-radius: 4px;
    }
    .chatbot-widget-message.user .chatbot-widget-message-bubble {
      border-top-right-radius: 4px;
    }
    .chatbot-widget-message-bubble > *:first-child {
      margin-top: 0;
    }
    .chatbot-widget-message-bubble > *:last-child {
      margin-bottom: 0;
    }
    .chatbot-widget-message-bubble p,
    .chatbot-widget-message-bubble ul,
    .chatbot-widget-message-bubble ol,
    .chatbot-widget-message-bubble pre,
    .chatbot-widget-message-bubble blockquote,
    .chatbot-widget-message-bubble table,
    .chatbot-widget-message-bubble h1,
    .chatbot-widget-message-bubble h2,
    .chatbot-widget-message-bubble h3,
    .chatbot-widget-message-bubble h4,
    .chatbot-widget-message-bubble h5,
    .chatbot-widget-message-bubble h6,
    .chatbot-widget-message-bubble hr {
      margin: 8px 0;
    }
    .chatbot-widget-message-bubble h1,
    .chatbot-widget-message-bubble h2,
    .chatbot-widget-message-bubble h3,
    .chatbot-widget-message-bubble h4,
    .chatbot-widget-message-bubble h5,
    .chatbot-widget-message-bubble h6 {
      font-weight: 600;
      line-height: 1.3;
    }
    .chatbot-widget-message-bubble h1 { font-size: var(--chatbot-widget-heading-1); }
    .chatbot-widget-message-bubble h2 { font-size: var(--chatbot-widget-heading-2); }
    .chatbot-widget-message-bubble h3,
    .chatbot-widget-message-bubble h4,
    .chatbot-widget-message-bubble h5,
    .chatbot-widget-message-bubble h6 { font-size: var(--chatbot-widget-heading-3); }
    .chatbot-widget-message-bubble ul,
    .chatbot-widget-message-bubble ol {
      padding-left: 20px;
    }
    .chatbot-widget-message-bubble li + li {
      margin-top: 4px;
    }
    .chatbot-widget-message-bubble a {
      color: inherit;
      text-decoration: underline;
      overflow-wrap: anywhere;
    }
    .chatbot-widget-message-bubble code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .chatbot-widget-message.bot .chatbot-widget-message-bubble code {
      padding: 2px 5px;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.08);
    }
    .chatbot-widget-message.bot .chatbot-widget-message-bubble pre {
      overflow-x: auto;
      border-radius: 12px;
      padding: 12px;
      background: #0f172a;
      color: #e2e8f0;
    }
    .chatbot-widget-message.bot .chatbot-widget-message-bubble pre code {
      padding: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
    }
    .chatbot-widget-message.bot .chatbot-widget-message-bubble blockquote {
      padding-left: 12px;
      border-left: 2px solid #cbd5e1;
      color: #475569;
      font-style: italic;
    }
    .chatbot-widget-message.bot .chatbot-widget-message-bubble table {
      display: block;
      width: 100%;
      overflow-x: auto;
      border-collapse: collapse;
      font-size: var(--chatbot-widget-label);
    }
    .chatbot-widget-message.bot .chatbot-widget-message-bubble th,
    .chatbot-widget-message.bot .chatbot-widget-message-bubble td {
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      text-align: left;
      vertical-align: top;
    }
    .chatbot-widget-message.bot .chatbot-widget-message-bubble th {
      background: #e2e8f0;
      font-weight: 600;
    }
    .chatbot-widget-message.bot .chatbot-widget-message-bubble hr {
      border: none;
      border-top: 1px solid #cbd5e1;
    }
    .chatbot-widget-typing {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background: #f1f5f9;
      border-radius: 16px;
      border-top-left-radius: 4px;
    }
    .chatbot-widget-typing span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #94a3b8;
      animation: typing 1s infinite;
    }
    .chatbot-widget-typing span:nth-child(2) { animation-delay: 0.2s; }
    .chatbot-widget-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    .chatbot-widget-input-area {
      padding: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
      align-items: center;
      overflow: hidden;
    }
    .chatbot-widget-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      font-size: var(--chatbot-widget-text);
      outline: none;
      transition: border-color 0.2s;
    }
    .chatbot-widget-input:focus {
      border-color: #3b82f6;
    }
    .chatbot-widget-send {
      width: 40px;
      height: 40px;
      min-width: 40px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
      flex-shrink: 0;
    }
    .chatbot-widget-send:hover {
      transform: scale(1.05);
    }
    .chatbot-widget-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .chatbot-widget-send svg {
      width: 18px;
      height: 18px;
    }
    .chatbot-widget-voice {
      width: 40px;
      height: 40px;
      min-width: 40px;
      border-radius: 50%;
      border: 2px solid;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, background 0.2s;
      flex-shrink: 0;
    }
    .chatbot-widget-voice:hover {
      transform: scale(1.05);
    }
    .chatbot-widget-voice:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .chatbot-widget-voice svg {
      width: 18px;
      height: 18px;
    }
    .chatbot-widget-voice.active {
      background: #22c55e;
      border-color: #22c55e;
      color: white;
      animation: pulse 1.5s infinite;
    }
    .chatbot-widget-voice-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: var(--chatbot-widget-small);
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      flex: 1;
      min-width: 0;
    }
    .chatbot-widget-voice-status .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse 1s infinite;
    }
    .chatbot-widget-voice-end {
      width: 40px;
      height: 40px;
      min-width: 40px;
      border-radius: 50%;
      border: none;
      background: #ef4444;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .chatbot-widget-voice-end:hover {
      background: #dc2626;
    }
    .chatbot-widget-voice-end svg {
      width: 18px;
      height: 18px;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    .chatbot-widget-rating {
      padding: 12px 16px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }
    .chatbot-widget-rating-text {
      font-size: var(--chatbot-widget-small);
      color: #64748b;
      margin-bottom: 8px;
    }
    .chatbot-widget-rating-stars {
      display: flex;
      justify-content: center;
      gap: 8px;
    }
    .chatbot-widget-rating-star {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      font-size: 20px;
      color: #cbd5e1;
      transition: color 0.2s, transform 0.2s;
    }
    .chatbot-widget-rating-star:hover {
      color: #fbbf24;
      transform: scale(1.2);
    }
    .chatbot-widget-rating-dismiss {
      margin-top: 8px;
      font-size: 11px;
      color: #94a3b8;
      cursor: pointer;
      background: none;
      border: none;
    }
    .chatbot-widget-rating-dismiss:hover {
      color: #64748b;
    }
    .chatbot-widget-error {
      padding: 8px 16px;
      background: #fef2f2;
      border-top: 1px solid #fecaca;
      font-size: var(--chatbot-widget-small);
      color: #dc2626;
      text-align: center;
    }
    .chatbot-widget-error-retry {
      background: #dc2626;
      color: white;
      border: none;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      margin-left: 8px;
      font-size: 11px;
    }
    .chatbot-widget-privacy {
      padding: 8px 12px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #64748b;
      font-size: var(--chatbot-widget-small);
      line-height: 1.4;
    }
    @media (max-width: 480px) {
      .chatbot-widget-container {
        width: 100%;
        height: 100%;
        bottom: 0;
        right: 0;
        border-radius: 0;
        --chatbot-widget-text: 13px;
        --chatbot-widget-small: 11px;
        --chatbot-widget-label: 12px;
        --chatbot-widget-title: 17px;
        --chatbot-widget-heading-1: 17px;
        --chatbot-widget-heading-2: 15px;
        --chatbot-widget-heading-3: 14px;
      }
      .chatbot-widget-header,
      .chatbot-widget-messages,
      .chatbot-widget-input-area {
        padding: 12px;
      }
      .chatbot-widget-messages {
        gap: 12px;
      }
      .chatbot-widget-message {
        gap: 10px;
        max-width: 92%;
      }
      .chatbot-widget-message-bubble {
        padding: 9px 12px;
      }
    }
    @media (min-width: 1024px) and (min-height: 760px) {
      .chatbot-widget-container {
        width: 400px;
        height: 660px;
        --chatbot-widget-text: 15px;
        --chatbot-widget-small: 12px;
        --chatbot-widget-label: 13px;
        --chatbot-widget-title: 19px;
        --chatbot-widget-heading-1: 19px;
        --chatbot-widget-heading-2: 17px;
        --chatbot-widget-heading-3: 16px;
      }
    }
    .chatbot-widget-lead-form {
      padding: 24px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .chatbot-widget-lead-title {
      font-size: var(--chatbot-widget-title);
      font-weight: 600;
      margin-bottom: 8px;
    }
    .chatbot-widget-lead-desc {
      font-size: var(--chatbot-widget-text);
      color: #64748b;
      margin-bottom: 20px;
    }
    .chatbot-widget-lead-field {
      margin-bottom: 12px;
    }
    .chatbot-widget-lead-label {
      display: block;
      font-size: var(--chatbot-widget-label);
      font-weight: 500;
      margin-bottom: 4px;
    }
    .chatbot-widget-lead-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: var(--chatbot-widget-text);
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .chatbot-widget-lead-input:focus {
      outline: none;
      border-color: var(--primary-color, #3B82F6);
    }
    .chatbot-widget-lead-submit {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: var(--chatbot-widget-text);
      font-weight: 500;
      cursor: pointer;
      margin-top: 8px;
      transition: opacity 0.2s;
    }
    .chatbot-widget-lead-submit:hover {
      opacity: 0.9;
    }
    .chatbot-widget-lead-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    /* DIF Zapopan visual layer: scoped so WordPress themes cannot override it. */
    #chatbot-widget-root.sofia-widget-root,
    #chatbot-widget-root.sofia-widget-root * { box-sizing: border-box !important; }
    #chatbot-widget-root.sofia-widget-root { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    #chatbot-widget-root .chatbot-widget-button,
    #chatbot-widget-root .chatbot-widget-container { pointer-events: auto; }
    #chatbot-widget-root .chatbot-widget-container { width: min(390px, calc(100vw - 32px)); height: min(680px, calc(100vh - 32px)); border-radius: 8px; background: #FFFFFF; color: #1F2937; box-shadow: 0 18px 48px rgba(23, 54, 93, .24); }
    #chatbot-widget-root .chatbot-widget-header { min-height: 72px; padding: 14px 16px; background: linear-gradient(135deg, #F4066D 0%, #FF8200 100%) !important; color: #FFFFFF !important; }
    #chatbot-widget-root .chatbot-widget-name { font-size: 17px; font-weight: 700; }
    #chatbot-widget-root .chatbot-widget-status { font-size: 13px; opacity: 1; }
    #chatbot-widget-root .chatbot-widget-status-dot { background: #6CC24A; box-shadow: 0 0 0 2px rgba(255,255,255,.25); }
    #chatbot-widget-root .chatbot-widget-avatar { width: 42px; height: 42px; background: #FFFFFF; border: 2px solid rgba(255,255,255,.85); }
    #chatbot-widget-root .chatbot-widget-avatar-img,
    #chatbot-widget-root .chatbot-widget-message-avatar-img,
    #chatbot-widget-root .chatbot-widget-button-avatar-img { object-fit: contain; }
    #chatbot-widget-root.sofia-widget-root .chatbot-widget-button-avatar-img { position: absolute !important; inset: 0 !important; display: block !important; width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important; visibility: visible !important; opacity: 1 !important; object-fit: contain !important; }
    #chatbot-widget-root .chatbot-widget-button { background: #F4066D !important; color: #FFFFFF !important; box-shadow: 0 8px 22px rgba(244, 6, 109, .32); }
    #chatbot-widget-root.sofia-widget-root .chatbot-widget-button.has-avatar { background-color: transparent !important; box-shadow: none !important; }
    #chatbot-widget-root .chatbot-widget-button:hover { background: #D90461 !important; }
    #chatbot-widget-root .chatbot-widget-messages { padding: 16px; gap: 14px; background: #F8FAFC; scrollbar-width: thin; scrollbar-color: #CBD5E1 transparent; }
    #chatbot-widget-root .chatbot-widget-messages::-webkit-scrollbar { width: 6px; }
    #chatbot-widget-root .chatbot-widget-messages::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 999px; }
    #chatbot-widget-root .chatbot-widget-message { max-width: 90%; }
    #chatbot-widget-root .chatbot-widget-message-bubble { font-size: 15px; line-height: 1.55; }
    #chatbot-widget-root .chatbot-widget-message.bot .chatbot-widget-message-bubble { background: #F3F4F6; color: #1F2937; }
    #chatbot-widget-root .chatbot-widget-message.user .chatbot-widget-message-bubble { background: #F4066D !important; color: #FFFFFF !important; }
    #chatbot-widget-root .chatbot-widget-message-bubble a { color: #00A9E0; }
    #chatbot-widget-root .chatbot-widget-message.user .chatbot-widget-message-bubble a { color: #FFFFFF; }
    #chatbot-widget-root .chatbot-widget-message-bubble p { margin: 0 0 10px; }
    #chatbot-widget-root .chatbot-widget-message-bubble ul,
    #chatbot-widget-root .chatbot-widget-message-bubble ol { margin: 8px 0 8px 20px; padding: 0; }
    /* Render ordered-list numbers explicitly so host-site resets cannot hide them. */
    #chatbot-widget-root .chatbot-widget-message-bubble ul { list-style: disc outside !important; }
    #chatbot-widget-root .chatbot-widget-message-bubble ol { list-style: none !important; }
    #chatbot-widget-root .chatbot-widget-message-bubble li { margin-bottom: 5px; line-height: 1.5; }
    #chatbot-widget-root .chatbot-widget-message-bubble .chatbot-widget-list-number { display: inline-block !important; min-width: 1.5em !important; font-weight: 700 !important; }
    #chatbot-widget-root .chatbot-widget-input-area { padding: 12px 14px; border-color: #E5E7EB; background: #FFFFFF; }
    #chatbot-widget-root .chatbot-widget-input { min-height: 44px; border-color: #E5E7EB; color: #1F2937; font-size: 15px; }
    #chatbot-widget-root .chatbot-widget-send { width: 44px; height: 44px; min-width: 44px; background: #F4066D !important; color: #FFFFFF !important; }
    #chatbot-widget-root .chatbot-widget-send:hover { background: #D90461 !important; }
    #chatbot-widget-root.sofia-widget-root .chatbot-widget-send { color: #FFFFFF !important; }
    #chatbot-widget-root.sofia-widget-root .chatbot-widget-send .sofia-send-icon { display: block !important; width: 20px !important; height: 20px !important; min-width: 20px !important; min-height: 20px !important; visibility: visible !important; opacity: 1 !important; overflow: visible !important; fill: none !important; stroke: #FFFFFF !important; stroke-width: 2 !important; color: #FFFFFF !important; pointer-events: none !important; }
    #chatbot-widget-root .chatbot-widget-privacy { padding: 8px 12px; background: #F3F4F6; border-color: #E5E7EB; color: #667085; font-size: 12px; line-height: 1.45; }
    #chatbot-widget-root .sofia-quick-replies { display: flex; flex-wrap: wrap; gap: 8px; margin: 2px 0 4px 44px; }
    #chatbot-widget-root .sofia-quick-reply { min-height: 44px; border: 1px solid #F4066D; border-radius: 999px; padding: 9px 14px; background: #FFFFFF; color: #F4066D; font: 600 14px/1.2 Inter, ui-sans-serif, system-ui, sans-serif; cursor: pointer; text-align: left; }
    #chatbot-widget-root .sofia-quick-reply:hover { background: #FFF0F6; }
    #chatbot-widget-root button:focus-visible,
    #chatbot-widget-root input:focus-visible { outline: 3px solid rgba(244, 6, 109, .3) !important; outline-offset: 2px; }
    @media (max-width: 480px) {
      #chatbot-widget-root .chatbot-widget-container { width: calc(100vw - 16px); height: calc(100dvh - 16px); right: 8px !important; bottom: 8px !important; border-radius: 8px; }
      #chatbot-widget-root .chatbot-widget-message { max-width: 94%; }
      #chatbot-widget-root .sofia-quick-replies { margin-left: 0; }
      #chatbot-widget-root .sofia-quick-reply { flex: 1 1 auto; }
    }
  `;
  document.head.appendChild(styles);
  
  const iconChat = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>';
  const iconClose = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  const iconBot = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';
  const iconUser = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iconSend = '<svg class="sofia-send-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
  const iconMic = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';
  const iconMicOff = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';
  const iconPhoneOff = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" x2="2" y1="2" y2="22"/></svg>';
  const SOFIA_DISPLAY_NAME = 'SofIA · DIF Zapopan';
  const SOFIA_WELCOME_MESSAGE = 'Hola 👋 Soy SofIA, asistente virtual del DIF Zapopan.\n\nPuedo ayudarte a encontrar trámites, servicios, apoyos y programas.\n\n¿Qué necesitas?\n\nTambién puedes escribir directamente lo que necesitas.';
  const MAIN_MENU_OPTIONS = [
    { label: '🔎 Buscar un servicio', value: 'ACTION_SEARCH' },
    { label: '⭐ Servicios destacados', value: 'ACTION_FEATURED' },
    { label: '❓ Preguntas frecuentes', value: 'ACTION_FAQ' },
    { label: '🧭 Necesito orientación', value: 'ACTION_GUIDED' },
  ];
  const DEFAULT_FEATURED_OPTIONS = [
    { label: 'Apoyos alimentarios', value: 'ACTION_FEATURED_1' },
    { label: 'Atención psicológica', value: 'ACTION_FEATURED_2' },
    { label: 'Servicios para personas mayores', value: 'ACTION_FEATURED_3' },
    { label: 'Discapacidad y rehabilitación', value: 'ACTION_FEATURED_4' },
    { label: 'Talleres y actividades', value: 'ACTION_FEATURED_5' },
    { label: 'Pláticas prematrimoniales', value: 'ACTION_FEATURED_6' },
  ];
  const DEFAULT_FAQ_OPTIONS = [
    { label: '¿Cómo busco un trámite o servicio?', value: 'FAQ_SEARCH', answer: 'Escribe con tus propias palabras lo que necesitas.\n\nPor ejemplo: “apoyo alimentario”, “psicología” o “pláticas prematrimoniales”.' },
    { label: '¿La información es oficial?', value: 'FAQ_OFFICIAL', answer: 'SofIA consulta información institucional del DIF Zapopan.\n\nLos contenidos deben mantenerse actualizados y validados por las áreas responsables.' },
    { label: '¿SofIA puede realizar trámites?', value: 'FAQ_PROCEDURES', answer: 'SofIA brinda orientación sobre trámites, servicios y programas.\n\nPor ahora no realiza trámites completos ni sustituye la atención del personal del DIF Zapopan.' },
    { label: '¿Puedo compartir datos personales?', value: 'FAQ_PRIVACY', answer: 'No compartas datos personales sensibles, contraseñas, documentos oficiales ni información de emergencia por este chat.' },
    { label: '¿Cómo regreso al menú principal?', value: 'FAQ_HOME', answer: 'Puedes escribir “menú”, “inicio” o usar el botón “Menú principal”.' },
  ];
  
  let config = null;
  let voiceConfig = null;
  let leadConfig = null;
  let messages = [];
  let isOpen = false;
  let isLoading = false;
  let isVoiceActive = false;
  let isVoiceConnecting = false;
  let isSpeaking = false;
  let conversation = null;
  let hasError = false;
  let errorMessage = '';
  let hasRated = false;
  let showRating = false;
  let lastUserMessage = '';
  let showLeadForm = false;
  let leadSubmitted = localStorage.getItem('chatbot-lead-' + chatbotId) === 'true';
  let visitorData = JSON.parse(localStorage.getItem('chatbot-visitor-' + chatbotId) || '{}');
  let sessionId = generateId();
  let menuMode = true;
  let quickReplyContext = 'main';
  let guidedStep = 0;
  let uxMode = '';
  
  function generateId() {
    return 'xxxx-xxxx-xxxx'.replace(/x/g, function() {
      return Math.floor(Math.random() * 16).toString(16);
    });
  }

  if (hideMobile && window.matchMedia && window.matchMedia('(max-width: 480px)').matches) {
    return;
  }

  function resolveAssetUrl(value) {
    if (!value) return '';
    try {
      return new URL(value, baseUrl).href;
    } catch (_error) {
      return '';
    }
  }

  function renderBotAvatar(className) {
    const avatarUrl = resolveAssetUrl(config && config.avatarImage);
    if (avatarUrl) {
      return '<img class="' + className + '-img" src="' + escapeHtmlAttribute(avatarUrl) + '" alt="' + escapeHtmlAttribute(SOFIA_DISPLAY_NAME) + '" loading="eager">';
    }
    return iconBot;
  }
  
  async function fetchConfig() {
    try {
      const configUrl = widgetApiUrl('/api/widget/' + chatbotId + '/config');
      const response = await fetch(configUrl, { credentials: 'omit' });
      if (!response.ok) {
        throw new Error('Widget config request failed: ' + response.status + ' ' + response.statusText);
      }
      config = await response.json();
      messages = [{ role: 'assistant', content: SOFIA_WELCOME_MESSAGE }];
      
      // Check if this chatbot has its own ElevenLabs agent configured
      if (ENABLE_ELEVENLABS_VOICE && config.elevenLabsAgentId) {
        voiceConfig = {
          agentId: config.elevenLabsAgentId,
          enabled: true,
        };
      }
      
      // Fetch lead capture config
      try {
        const leadResponse = await fetch(widgetApiUrl('/api/widget/' + chatbotId + '/lead-config'), { credentials: 'omit' });
        if (leadResponse.ok) {
          leadConfig = await leadResponse.json();
          // Show lead form if required and not already submitted
          if (leadConfig.requireLeadCapture && !leadSubmitted) {
            showLeadForm = true;
          }
        }
      } catch (e) {
        console.log('Lead capture not configured');
      }
      
      render();
      if (shouldAutoOpen) {
        setTimeout(function() {
          isOpen = true;
          render();
        }, openDelayMs);
      }
    } catch (error) {
      console.error('ChatBot Widget: Failed to load config', {
        url: widgetApiUrl('/api/widget/' + chatbotId + '/config'),
        origin: window.location.origin,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  function getFeaturedOptions() {
    const configured = Array.isArray(config && config.featuredServices) ? config.featuredServices : [];
    return configured.length > 0 ? configured : DEFAULT_FEATURED_OPTIONS;
  }

  function getFaqOptions() {
    const configured = Array.isArray(config && config.faqItems) ? config.faqItems : [];
    return configured.length > 0 ? configured : DEFAULT_FAQ_OPTIONS;
  }

  function renderQuickReplies() {
    if (isLoading) return '';
    let options = [];
    if (menuMode || quickReplyContext === 'main') options = MAIN_MENU_OPTIONS;
    else if (quickReplyContext === 'featured') options = getFeaturedOptions();
    else if (quickReplyContext === 'faq') options = getFaqOptions();
    else if (messages.length > 1 && messages[messages.length - 1].role === 'assistant') {
      options = [
        { label: '🏠 Menú principal', value: 'ACTION_HOME' },
        { label: '🔎 Buscar otro servicio', value: 'ACTION_NEW_SEARCH' },
      ];
    }
    if (!options.length) return '';
    return '<div class="sofia-quick-replies" role="group" aria-label="Acciones rápidas">' + options.map(function(option) {
      return '<button type="button" class="sofia-quick-reply" data-action="' + escapeHtmlAttribute(option.value) + '" title="' + escapeHtmlAttribute(option.label) + '">' + escapeHtml(option.label) + '</button>';
    }).join('') + '</div>';
  }

  function appendAssistantMessage(content) {
    messages.push({ role: 'assistant', content: content });
  }

  function resetNavigation() {
    menuMode = true;
    quickReplyContext = 'main';
    guidedStep = 0;
    uxMode = '';
  }

  function isHomeMenuCommand(value) {
    return /^(menu|menú|inicio|volver|volver al menu|volver al menú|regresar al menu|regresar al menú|menu principal|menú principal)[!.?\s]*$/i.test(String(value || '').trim());
  }
  function showMainMenu() {
    messages = [{ role: 'assistant', content: SOFIA_WELCOME_MESSAGE }];
    resetNavigation();
    hasError = false;
    errorMessage = '';
    render();
  }

  function handleQuickAction(action) {
    const actionValue = String(action || '');
    if (actionValue === 'ACTION_HOME') return showMainMenu();
    if (actionValue === 'ACTION_SEARCH' || actionValue === 'ACTION_NEW_SEARCH') {
      menuMode = false;
      quickReplyContext = 'post';
      uxMode = 'search';
      appendAssistantMessage('Escribe con tus propias palabras lo que necesitas.\n\nPor ejemplo:\n\n- apoyo alimentario\n- atención psicológica\n- pláticas prematrimoniales\n- servicios para personas mayores');
      render();
      return;
    }
    if (actionValue === 'ACTION_GUIDED') {
      menuMode = false;
      quickReplyContext = 'guided';
      uxMode = 'guided';
      guidedStep = 1;
      appendAssistantMessage('Te ayudo 😊\n\n¿Para quién es el apoyo o servicio?\n\n1) Para mí\n2) Niñez\n3) Persona adulta mayor\n4) Persona con discapacidad\n5) Familia o persona cuidadora');
      render();
      return;
    }
    if (actionValue === 'ACTION_FEATURED') {
      menuMode = false;
      quickReplyContext = 'featured';
      appendAssistantMessage('Estos son algunos de los servicios más consultados:\n\nElige una opción o escribe lo que necesitas.');
      render();
      return;
    }
    if (actionValue === 'ACTION_FAQ') {
      menuMode = false;
      quickReplyContext = 'faq';
      appendAssistantMessage('Preguntas frecuentes');
      render();
      return;
    }
    const faqOption = getFaqOptions().find(function(option) { return option.value === actionValue; });
    if (faqOption) {
      messages.push({ role: 'user', content: faqOption.label });
      appendAssistantMessage(faqOption.answer);
      quickReplyContext = 'post';
      render();
      return;
    }
    const featuredOption = getFeaturedOptions().find(function(option) { return option.value === actionValue; });
    if (featuredOption) {
      quickReplyContext = 'post';
      sendMessage(featuredOption.query || featuredOption.label);
    }
  }
  function render() {
    if (!config) return;
    
    let container = document.getElementById('chatbot-widget-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'chatbot-widget-root';
      container.className = 'sofia-widget-root';
      document.body.appendChild(container);
    }
    
    const positionStyles = {
      'bottom-right': 'bottom: 24px; right: 24px;',
      'bottom-left': 'bottom: 24px; left: 24px;',
      'top-right': 'top: 24px; right: 24px;',
      'top-left': 'top: 24px; left: 24px;'
    };
    
    const position = config.position || 'bottom-right';
    const posStyle = positionStyles[position];
    const buttonAvatarUrl = config.avatarImage ? resolveAssetUrl(config.avatarImage) : '';
    const buttonStyle = buttonAvatarUrl
      ? `${posStyle} background: transparent url("${escapeHtmlAttribute(buttonAvatarUrl)}") center / contain no-repeat !important; color: transparent !important;`
      : `${posStyle} background: ${config.primaryColor || '#3B82F6'}; color: ${config.textColor || '#fff'};`;
    
    container.innerHTML = `
      <button class="chatbot-widget-button${buttonAvatarUrl ? ' has-avatar' : ''}" id="chatbot-toggle" style="${buttonStyle}">
        ${buttonAvatarUrl ? renderBotAvatar('chatbot-widget-button-avatar') : iconChat}
      </button>
      <div class="chatbot-widget-container ${isOpen ? 'open' : ''}" id="chatbot-container" style="${posStyle}">
        <div class="chatbot-widget-header" style="background: ${config.primaryColor || '#3B82F6'}; color: ${config.textColor || '#fff'};">
          <div class="chatbot-widget-header-info">
            <div class="chatbot-widget-avatar">${renderBotAvatar('chatbot-widget-avatar')}</div>
            <div>
              <div class="chatbot-widget-name">${SOFIA_DISPLAY_NAME}</div>
              <div class="chatbot-widget-status">
                <span class="chatbot-widget-status-dot"></span>
                En línea
              </div>
            </div>
          </div>
          <button type="button" aria-label="Cerrar chat" title="Cerrar chat" class="chatbot-widget-close" id="chatbot-close" style="color: ${config.textColor || '#fff'};">
            ${iconClose}
          </button>
        </div>
        ${showLeadForm ? `
          <div class="chatbot-widget-lead-form" id="chatbot-lead-form">
            <div class="chatbot-widget-lead-title">Antes de comenzar</div>
            <div class="chatbot-widget-lead-desc">Por favor, comparte tus datos para brindarte una mejor atención.</div>
            ${(typeof leadConfig?.leadCaptureFields === 'string' 
              ? leadConfig.leadCaptureFields.split(',').map(s => s.trim()).filter(s => s) 
              : (leadConfig?.leadCaptureFields || ['name', 'email'])).map(field => {
              const labels = { name: 'Nombre', email: 'Email', phone: 'Teléfono', company: 'Empresa' };
              const types = { name: 'text', email: 'email', phone: 'tel', company: 'text' };
              const placeholders = { name: 'Tu nombre', email: 'tu@email.com', phone: '+1 234 567 890', company: 'Tu empresa' };
              return `
                <div class="chatbot-widget-lead-field">
                  <label class="chatbot-widget-lead-label">${labels[field] || field}</label>
                  <input type="${types[field] || 'text'}" 
                    class="chatbot-widget-lead-input" 
                    id="chatbot-lead-${field}"
                    placeholder="${placeholders[field] || ''}"
                    value="${visitorData[field] || ''}"
                    style="--primary-color: ${config.primaryColor || '#3B82F6'}">
                </div>
              `;
            }).join('')}
            <button class="chatbot-widget-lead-submit" id="chatbot-lead-submit" 
              style="background: ${config.primaryColor || '#3B82F6'}; color: ${config.textColor || '#fff'};">
              Comenzar Chat
            </button>
          </div>
        ` : `
          <div class="chatbot-widget-messages" id="chatbot-messages">
            ${messages.map(m => `
              <div class="chatbot-widget-message ${m.role === 'user' ? 'user' : 'bot'}">
                <div class="chatbot-widget-message-avatar" style="${m.role === 'user' ? 'background: #e2e8f0; color: #64748b;' : 'background: ' + (config.primaryColor || '#3B82F6') + '; color: ' + (config.textColor || '#fff') + ';'}">
                  ${m.role === 'user' ? iconUser : renderBotAvatar('chatbot-widget-message-avatar')}
                </div>
                <div class="chatbot-widget-message-bubble" style="${m.role === 'user' ? 'background: ' + (config.primaryColor || '#3B82F6') + '; color: ' + (config.textColor || '#fff') + ';' : ''}">
                  ${renderMessageContent(m)}
                </div>
              </div>
            `).join('')}
            ${renderQuickReplies()}
            ${isLoading ? `
              <div class="chatbot-widget-message bot">
                <div class="chatbot-widget-message-avatar" style="background: ${config.primaryColor || '#3B82F6'}; color: ${config.textColor || '#fff'};">
                  ${renderBotAvatar('chatbot-widget-message-avatar')}
                </div>
                <div class="chatbot-widget-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            ` : ''}
          </div>
          <div class="chatbot-widget-input-area">
          ${isVoiceActive ? '' : `<input type="text" class="chatbot-widget-input" id="chatbot-input" placeholder="Escribe tu mensaje..." aria-label="Escribe tu mensaje" ${isLoading ? 'disabled' : ''}>`}
          ${voiceConfig && voiceConfig.enabled ? (
            isVoiceActive ? `
              <div class="chatbot-widget-voice-status" style="background: ${isSpeaking ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)'}; color: ${isSpeaking ? '#22c55e' : '#3b82f6'};">
                <span class="dot" style="background: ${isSpeaking ? '#22c55e' : '#3b82f6'};"></span>
                ${isSpeaking ? 'Hablando...' : 'Escuchando...'}
              </div>
              <button class="chatbot-widget-voice-end" id="chatbot-voice-end" title="Terminar llamada">
                ${iconPhoneOff}
              </button>
            ` : `
              <button class="chatbot-widget-voice ${isVoiceConnecting ? 'connecting' : ''}" id="chatbot-voice"
                style="border-color: ${config.primaryColor || '#3B82F6'}; color: ${config.primaryColor || '#3B82F6'};"
                title="Iniciar conversación por voz" ${isVoiceConnecting ? 'disabled' : ''}>
                ${iconMic}
              </button>
            `
          ) : ''}
          <button type="button" aria-label="Enviar mensaje" title="Enviar mensaje" class="chatbot-widget-send" id="chatbot-send" style="background: ${config.primaryColor || '#3B82F6'}; color: ${config.textColor || '#fff'};" ${isLoading || isVoiceActive ? 'disabled' : ''}>
            ${iconSend}
          </button>
        </div>
        `}
        ${hasError ? `
          <div class="chatbot-widget-error">
            ${errorMessage}
            <button class="chatbot-widget-error-retry" id="chatbot-error-retry">Reintentar</button>
          </div>
        ` : ''}
        ${showRating ? `
          <div class="chatbot-widget-rating">
            <div class="chatbot-widget-rating-text">¿Cómo fue tu experiencia?</div>
            <div class="chatbot-widget-rating-stars">
              <button class="chatbot-widget-rating-star" data-rating="1">★</button>
              <button class="chatbot-widget-rating-star" data-rating="2">★</button>
              <button class="chatbot-widget-rating-star" data-rating="3">★</button>
              <button class="chatbot-widget-rating-star" data-rating="4">★</button>
              <button class="chatbot-widget-rating-star" data-rating="5">★</button>
            </div>
            <button class="chatbot-widget-rating-dismiss" id="chatbot-rating-dismiss">No, gracias</button>
          </div>
        ` : ''}
        ${config.privacyNotice ? `<div class="chatbot-widget-privacy">${escapeHtml(config.privacyNotice)}</div>` : ''}
      </div>
    `;
    
    document.getElementById('chatbot-toggle').onclick = function() {
      isOpen = true;
      render();
    };
    
    document.getElementById('chatbot-close').onclick = function() {
      isOpen = false;
      render();
    };
    
    document.querySelectorAll('.sofia-quick-reply').forEach(function(button) {
      button.onclick = function() {
        handleQuickAction(button.getAttribute('data-action'));
      };
    });

    // Lead form submission
    const leadSubmitBtn = document.getElementById('chatbot-lead-submit');
    if (leadSubmitBtn) {
      leadSubmitBtn.onclick = async function() {
        const rawFields = leadConfig?.leadCaptureFields || 'name,email';
        const fields = typeof rawFields === 'string' 
          ? rawFields.split(',').map(s => s.trim()).filter(s => s)
          : rawFields;
        const data = {};
        let isValid = true;
        
        fields.forEach(function(field) {
          const input = document.getElementById('chatbot-lead-' + field);
          if (input) {
            data[field] = input.value.trim();
            // Name and email are required when present in fields
            if (!data[field] && (field === 'name' || field === 'email') && fields.includes(field)) {
              isValid = false;
            }
          }
        });
        
        if (!isValid) {
          return;
        }
        
        visitorData = data;
        localStorage.setItem('chatbot-visitor-' + chatbotId, JSON.stringify(data));
        localStorage.setItem('chatbot-lead-' + chatbotId, 'true');
        leadSubmitted = true;
        showLeadForm = false;
        
        // Send visitor info to server
        try {
          await fetch(widgetApiUrl('/api/widget/' + chatbotId + '/conversation/' + sessionId + '/visitor'), {
            method: 'PATCH',
            credentials: 'omit',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitorName: data.name || null,
              visitorEmail: data.email || null,
              visitorPhone: data.phone || null,
              visitorCompany: data.company || null,
            }),
          });
        } catch (e) {
          console.log('Failed to save visitor info');
        }
        
        render();
      };
    }
    
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');

    function handleSend() {
      if (!input) return;
      const text = input.value.trim();
      if (!text || isLoading) return;
      sendMessage(text);
    }

    if (sendBtn) {
      sendBtn.onclick = handleSend;
    }
    if (input) {
      input.onkeypress = function(e) {
        if (e.key === 'Enter') handleSend();
      };
    }
    
    const voiceBtn = document.getElementById('chatbot-voice');
    if (voiceBtn) {
      voiceBtn.onclick = startVoiceConversation;
    }
    
    const voiceEndBtn = document.getElementById('chatbot-voice-end');
    if (voiceEndBtn) {
      voiceEndBtn.onclick = endVoiceConversation;
    }
    
    const ratingStars = document.querySelectorAll('.chatbot-widget-rating-star');
    ratingStars.forEach(function(star) {
      star.onclick = function() {
        const rating = parseInt(star.getAttribute('data-rating'));
        submitRating(rating);
      };
    });
    
    const ratingDismiss = document.getElementById('chatbot-rating-dismiss');
    if (ratingDismiss) {
      ratingDismiss.onclick = dismissRating;
    }
    
    const errorRetry = document.getElementById('chatbot-error-retry');
    if (errorRetry) {
      errorRetry.onclick = function() {
        hasError = false;
        errorMessage = '';
        if (lastUserMessage) {
          messages = messages.filter(m => m.content !== lastUserMessage || m.role !== 'user');
          messages = messages.filter(m => !m.content.includes('Lo siento, hubo un problema'));
          sendMessage(lastUserMessage);
        } else {
          render();
        }
      };
    }
    
    const messagesContainer = document.getElementById('chatbot-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
  
  // ElevenLabs SDK state
  let ElevenLabsConversation = null;

  async function startVoiceConversation() {
    if (!ENABLE_ELEVENLABS_VOICE) return;
    if (!voiceConfig || !voiceConfig.agentId || isVoiceConnecting) return;

    try {
      isVoiceConnecting = true;
      render();

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try to load and use ElevenLabs SDK via esm.sh CDN
      try {
        const module = await import('https://esm.sh/@elevenlabs/client@latest');
        ElevenLabsConversation = module.Conversation;

        conversation = await ElevenLabsConversation.startSession({
          agentId: voiceConfig.agentId,
          onConnect: function() {
            isVoiceConnecting = false;
            isVoiceActive = true;
            render();
          },
          onDisconnect: function() {
            isVoiceActive = false;
            isVoiceConnecting = false;
            isSpeaking = false;
            conversation = null;
            render();
          },
          onMessage: function(message) {
            if (message.message) {
              const role = message.source === 'user' ? 'user' : 'assistant';
              messages.push({ role: role, content: message.message });
              render();
            }
          },
          onError: function(err) {
            console.error('ElevenLabs error:', err);
            isVoiceActive = false;
            isVoiceConnecting = false;
            isSpeaking = false;
            conversation = null;
            render();
          },
          onModeChange: function(mode) {
            isSpeaking = mode.mode === 'speaking';
            render();
          }
        });
      } catch (sdkError) {
        console.error('ElevenLabs SDK failed, trying WebSocket fallback:', sdkError);

        // Fallback to signed URL WebSocket approach
        const signedUrlResponse = await fetch(widgetApiUrl('/api/widget/' + chatbotId + '/voice/signed-url'), { credentials: 'omit' });
        if (!signedUrlResponse.ok) {
          throw new Error('No se pudo obtener conexión de voz');
        }
        const data = await signedUrlResponse.json();

        if (!data.signed_url) {
          throw new Error('URL de voz no disponible');
        }

        // Note: WebSocket fallback won't have full audio functionality
        // User should use the SDK approach for full voice features
        conversation = new WebSocket(data.signed_url);

        conversation.onopen = function() {
          isVoiceConnecting = false;
          isVoiceActive = true;
          render();
        };

        conversation.onclose = function() {
          isVoiceActive = false;
          isVoiceConnecting = false;
          conversation = null;
          render();
        };

        conversation.onerror = function(err) {
          console.error('Voice WebSocket error:', err);
          isVoiceActive = false;
          isVoiceConnecting = false;
          conversation = null;
          render();
        };
      }

    } catch (error) {
      console.error('Failed to start voice:', error);
      alert('Error al iniciar voz: ' + error.message);
      isVoiceConnecting = false;
      isVoiceActive = false;
      render();
    }
  }

  async function endVoiceConversation() {
    if (conversation) {
      // Check if it's ElevenLabs SDK conversation or WebSocket
      if (typeof conversation.endSession === 'function') {
        await conversation.endSession();
      } else if (typeof conversation.close === 'function') {
        conversation.close();
      }
      conversation = null;
    }
    isVoiceActive = false;
    isSpeaking = false;
    render();
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeHtmlAttribute(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderMessageContent(message) {
    if (message.role === 'assistant') {
      return renderMarkdown(message.content);
    }
    return renderPlainText(message.content);
  }

  function renderPlainText(text) {
    return escapeHtml(text || '').replace(/\n/g, '<br>');
  }

  function renderMarkdown(markdown) {
    const normalized = String(markdown || '').replace(/\r\n?/g, '\n').trim();
    if (!normalized) {
      return '';
    }

    return renderMarkdownBlocks(normalized);
  }

  function renderMarkdownBlocks(markdown) {
    const lines = markdown.split('\n');
    const html = [];

    for (let index = 0; index < lines.length;) {
      const line = lines[index];

      if (!line.trim()) {
        index += 1;
        continue;
      }

      const fenceMatch = line.match(/^\s*(```+|~~~+)\s*([\w-]+)?\s*$/);
      if (fenceMatch) {
        const fence = fenceMatch[1];
        const language = fenceMatch[2] || '';
        const codeLines = [];
        index += 1;

        while (index < lines.length && !new RegExp('^\\s*' + escapeRegExp(fence) + '\\s*$').test(lines[index])) {
          codeLines.push(lines[index]);
          index += 1;
        }

        if (index < lines.length) {
          index += 1;
        }

        const languageClass = language
          ? ' class="' + escapeHtmlAttribute('language-' + language) + '"'
          : '';
        html.push('<pre><code' + languageClass + '>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
        continue;
      }

      if (isTableStart(lines, index)) {
        const headers = splitTableRow(lines[index]);
        const alignments = splitTableRow(lines[index + 1]).map(getTableAlignment);
        const rows = [];

        index += 2;

        while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
          rows.push(splitTableRow(lines[index]));
          index += 1;
        }

        html.push(renderTable(headers, rows, alignments));
        continue;
      }

      const headingMatch = line.match(/^\s*(#{1,6})\s+(.+?)\s*$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        html.push('<h' + level + '>' + renderInlineMarkdown(headingMatch[2]) + '</h' + level + '>');
        index += 1;
        continue;
      }

      if (isHorizontalRule(line)) {
        html.push('<hr>');
        index += 1;
        continue;
      }

      if (isBlockquoteLine(line)) {
        const quoteLines = [];

        while (index < lines.length) {
          const quoteLine = lines[index];
          if (!quoteLine.trim()) {
            quoteLines.push('');
            index += 1;
            continue;
          }

          if (!isBlockquoteLine(quoteLine)) {
            break;
          }

          quoteLines.push(quoteLine.replace(/^\s*>\s?/, ''));
          index += 1;
        }

        html.push('<blockquote>' + renderMarkdownBlocks(quoteLines.join('\n')) + '</blockquote>');
        continue;
      }

      if (isUnorderedListLine(line) || isOrderedListLine(line)) {
        const ordered = isOrderedListLine(line);
        const items = [];
        let start = 1;

        while (index < lines.length) {
          const currentLine = lines[index];
          if (!currentLine.trim()) {
            break;
          }

          const match = ordered
            ? currentLine.match(/^\s*(\d+)[.)]\s+(.*)$/)
            : currentLine.match(/^\s*[-*+]\s+(.*)$/);

          if (!match) {
            break;
          }

          if (ordered && items.length === 0) {
            start = parseInt(match[1], 10) || 1;
          }

          items.push(renderInlineMarkdown(match[ordered ? 2 : 1]));
          index += 1;
        }

        const tag = ordered ? 'ol' : 'ul';
        const startAttr = ordered && start !== 1
          ? ' start="' + escapeHtmlAttribute(start) + '"'
          : '';
        html.push('<' + tag + startAttr + '>' + items.map(function(item, itemIndex) {
          const number = ordered
            ? '<span class="chatbot-widget-list-number">' + (start + itemIndex) + '.</span>'
            : '';
          return '<li>' + number + item + '</li>';
        }).join('') + '</' + tag + '>');
        continue;
      }

      const paragraphLines = [];
      while (index < lines.length && lines[index].trim()) {
        if (paragraphLines.length > 0 && isMarkdownBlockStart(lines, index)) {
          break;
        }

        paragraphLines.push(lines[index]);
        index += 1;
      }

      html.push('<p>' + renderInlineMarkdown(paragraphLines.join('\n')) + '</p>');
    }

    return html.join('');
  }

  function renderInlineMarkdown(text) {
    const tokens = [];
    const stash = function(value) {
      const token = '@@CHAT_TOKEN_' + tokens.length + '@@';
      tokens.push(value);
      return token;
    };

    let html = escapeHtml(text || '');

    html = html.replace(/`([^`\n]+)`/g, function(_match, code) {
      return stash('<code>' + code + '</code>');
    });

    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function(_match, label, href) {
      const safeHref = sanitizeUrl(href);
      if (!safeHref) {
        return label;
      }

      return stash(
        '<a href="' + escapeHtmlAttribute(safeHref) + '" target="_blank" rel="noreferrer noopener">' + label + '</a>'
      );
    });

    html = html.replace(/(\*\*\*|___)(.+?)\1/g, '<strong><em>$2</em></strong>');
    html = html.replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    html = html.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
    html = html.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
    html = html.replace(/\n/g, '<br>');

    return html.replace(/@@CHAT_TOKEN_(\d+)@@/g, function(_match, tokenIndex) {
      return tokens[Number(tokenIndex)] || '';
    });
  }

  function renderTable(headers, rows, alignments) {
    const headerHtml = headers.map(function(cell, index) {
      return '<th' + getAlignmentAttribute(alignments[index]) + '>' + renderInlineMarkdown(cell) + '</th>';
    }).join('');

    const bodyHtml = rows.map(function(row) {
      return '<tr>' + headers.map(function(_cell, index) {
        return '<td' + getAlignmentAttribute(alignments[index]) + '>' + renderInlineMarkdown(row[index] || '') + '</td>';
      }).join('') + '</tr>';
    }).join('');

    return '<table><thead><tr>' + headerHtml + '</tr></thead><tbody>' + bodyHtml + '</tbody></table>';
  }

  function splitTableRow(row) {
    return row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(function(cell) {
        return cell.trim();
      });
  }

  function getTableAlignment(cell) {
    if (!cell) {
      return '';
    }

    const trimmed = cell.trim();
    const startsWithColon = trimmed.startsWith(':');
    const endsWithColon = trimmed.endsWith(':');

    if (startsWithColon && endsWithColon) {
      return 'center';
    }

    if (endsWithColon) {
      return 'right';
    }

    if (startsWithColon) {
      return 'left';
    }

    return '';
  }

  function getAlignmentAttribute(alignment) {
    return alignment
      ? ' style="text-align: ' + escapeHtmlAttribute(alignment) + ';"'
      : '';
  }

  function isTableStart(lines, index) {
    return Boolean(
      lines[index + 1] &&
      lines[index].includes('|') &&
      isTableSeparator(lines[index + 1])
    );
  }

  function isTableSeparator(line) {
    return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
  }

  function isMarkdownBlockStart(lines, index) {
    const line = lines[index];
    return (
      isTableStart(lines, index) ||
      /^\s*(#{1,6})\s+/.test(line) ||
      /^\s*(```+|~~~+)/.test(line) ||
      isHorizontalRule(line) ||
      isBlockquoteLine(line) ||
      isUnorderedListLine(line) ||
      isOrderedListLine(line)
    );
  }

  function isHorizontalRule(line) {
    return /^\s*(?:\*\s*){3,}$/.test(line) ||
      /^\s*(?:-\s*){3,}$/.test(line) ||
      /^\s*(?:_\s*){3,}$/.test(line);
  }

  function isBlockquoteLine(line) {
    return /^\s*>\s?/.test(line);
  }

  function isUnorderedListLine(line) {
    return /^\s*[-*+]\s+/.test(line);
  }

  function isOrderedListLine(line) {
    return /^\s*\d+[.)]\s+/.test(line);
  }

  function sanitizeUrl(url) {
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
        return parsed.href;
      }
    } catch (_error) {}

    return '';
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  async function sendMessage(text) {
    if (isHomeMenuCommand(text)) {
      showMainMenu();
      return;
    }
    lastUserMessage = text;
    hasError = false;
    errorMessage = '';
    messages.push({ role: 'user', content: text });
    isLoading = true;
    render();
    
    try {
      const response = await fetch(widgetApiUrl('/api/widget/' + chatbotId + '/chat'), {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId })
      });
      
      if (!response.ok) throw new Error('Chat request failed');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let botMessage = { role: 'assistant', content: '' };
      messages.push(botMessage);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                botMessage.content += data.content;
                render();
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('ChatBot Widget: Chat error', error);
      hasError = true;
      errorMessage = 'No se pudo conectar. Por favor, verifica tu conexión e intenta de nuevo.';
      messages.push({ role: 'assistant', content: 'Lo siento, hubo un problema de conexión. Por favor, intenta de nuevo.' });
    } finally {
      isLoading = false;
      if (messages.length > 4 && !hasRated) {
        showRating = true;
      }
      render();
    }
  }
  
  async function submitRating(rating) {
    try {
      const response = await fetch(widgetApiUrl('/api/widget/' + chatbotId + '/rate'), {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId, rating: rating })
      });
      if (response.ok) {
        hasRated = true;
        showRating = false;
        render();
      }
    } catch (e) {
      console.error('Failed to submit rating', e);
    }
  }
  
  function dismissRating() {
    showRating = false;
    hasRated = true;
    render();
  }
  
  fetchConfig();
})();

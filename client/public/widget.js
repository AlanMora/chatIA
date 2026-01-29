(function() {
  'use strict';
  
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot-id');
  
  if (!chatbotId) {
    console.error('ChatBot Widget: Missing data-chatbot-id attribute');
    return;
  }
  
  const baseUrl = script.src.replace('/widget.js', '');
  
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
    .chatbot-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 384px;
      height: 600px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      z-index: 9999;
      display: none;
      flex-direction: column;
      background: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    .chatbot-widget-name {
      font-weight: 600;
      font-size: 14px;
    }
    .chatbot-widget-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
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
      font-size: 14px;
      line-height: 1.4;
    }
    .chatbot-widget-message.bot .chatbot-widget-message-bubble {
      background: #f1f5f9;
      color: #1e293b;
      border-top-left-radius: 4px;
    }
    .chatbot-widget-message.user .chatbot-widget-message-bubble {
      border-top-right-radius: 4px;
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
    }
    .chatbot-widget-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .chatbot-widget-input:focus {
      border-color: #3b82f6;
    }
    .chatbot-widget-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
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
      border-radius: 50%;
      border: 2px solid;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, background 0.2s;
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
      gap: 6px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
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
      border-radius: 50%;
      border: none;
      background: #ef4444;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
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
      font-size: 12px;
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
      font-size: 12px;
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
    @media (max-width: 480px) {
      .chatbot-widget-container {
        width: 100%;
        height: 100%;
        bottom: 0;
        right: 0;
        border-radius: 0;
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
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .chatbot-widget-lead-desc {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 20px;
    }
    .chatbot-widget-lead-field {
      margin-bottom: 12px;
    }
    .chatbot-widget-lead-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .chatbot-widget-lead-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
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
      font-size: 14px;
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
  `;
  document.head.appendChild(styles);
  
  const iconChat = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>';
  const iconClose = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  const iconBot = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';
  const iconUser = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iconSend = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
  const iconMic = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';
  const iconMicOff = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';
  const iconPhoneOff = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" x2="2" y1="2" y2="22"/></svg>';
  
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
  let sessionId = localStorage.getItem('chatbot-session-' + chatbotId) || generateId();
  localStorage.setItem('chatbot-session-' + chatbotId, sessionId);
  
  function generateId() {
    return 'xxxx-xxxx-xxxx'.replace(/x/g, function() {
      return Math.floor(Math.random() * 16).toString(16);
    });
  }
  
  async function fetchConfig() {
    try {
      const response = await fetch(baseUrl + '/api/widget/' + chatbotId + '/config');
      if (!response.ok) throw new Error('Failed to fetch config');
      config = await response.json();
      if (config.welcomeMessage) {
        messages.push({ role: 'assistant', content: config.welcomeMessage });
      }
      
      // Check if this chatbot has its own ElevenLabs agent configured
      if (config.elevenLabsAgentId) {
        voiceConfig = {
          agentId: config.elevenLabsAgentId,
          enabled: true,
        };
      }
      
      // Fetch lead capture config
      try {
        const leadResponse = await fetch(baseUrl + '/api/widget/' + chatbotId + '/lead-config');
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
    } catch (error) {
      console.error('ChatBot Widget: Failed to load config', error);
    }
  }
  
  function render() {
    if (!config) return;
    
    let container = document.getElementById('chatbot-widget-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'chatbot-widget-root';
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
    
    container.innerHTML = `
      <button class="chatbot-widget-button" id="chatbot-toggle" style="${posStyle} background: ${config.primaryColor || '#3B82F6'}; color: ${config.textColor || '#fff'};">
        ${iconChat}
      </button>
      <div class="chatbot-widget-container ${isOpen ? 'open' : ''}" id="chatbot-container" style="${posStyle}">
        <div class="chatbot-widget-header" style="background: ${config.primaryColor || '#3B82F6'}; color: ${config.textColor || '#fff'};">
          <div class="chatbot-widget-header-info">
            <div class="chatbot-widget-avatar">${iconBot}</div>
            <div>
              <div class="chatbot-widget-name">${config.name || 'Chatbot'}</div>
              <div class="chatbot-widget-status">
                <span class="chatbot-widget-status-dot"></span>
                Online
              </div>
            </div>
          </div>
          <button class="chatbot-widget-close" id="chatbot-close" style="color: ${config.textColor || '#fff'};">
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
                  ${m.role === 'user' ? iconUser : iconBot}
                </div>
                <div class="chatbot-widget-message-bubble" style="${m.role === 'user' ? 'background: ' + (config.primaryColor || '#3B82F6') + '; color: ' + (config.textColor || '#fff') + ';' : ''}">
                  ${escapeHtml(m.content)}
                </div>
              </div>
            `).join('')}
            ${isLoading ? `
              <div class="chatbot-widget-message bot">
                <div class="chatbot-widget-message-avatar" style="background: ${config.primaryColor || '#3B82F6'}; color: ${config.textColor || '#fff'};">
                  ${iconBot}
                </div>
                <div class="chatbot-widget-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            ` : ''}
          </div>
          <div class="chatbot-widget-input-area">
          <input type="text" class="chatbot-widget-input" id="chatbot-input" placeholder="Type a message..." ${isLoading ? 'disabled' : ''}>
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
          <button class="chatbot-widget-send" id="chatbot-send" style="background: ${config.primaryColor || '#3B82F6'}; color: ${config.textColor || '#fff'};" ${isLoading ? 'disabled' : ''}>
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
          await fetch(baseUrl + '/api/widget/' + chatbotId + '/conversation/' + sessionId + '/visitor', {
            method: 'PATCH',
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
      const text = input.value.trim();
      if (!text || isLoading) return;
      sendMessage(text);
    }
    
    sendBtn.onclick = handleSend;
    input.onkeypress = function(e) {
      if (e.key === 'Enter') handleSend();
    };
    
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
        const signedUrlResponse = await fetch(baseUrl + '/api/widget/' + chatbotId + '/voice/signed-url');
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
  
  async function sendMessage(text) {
    lastUserMessage = text;
    hasError = false;
    errorMessage = '';
    messages.push({ role: 'user', content: text });
    isLoading = true;
    render();
    
    try {
      const response = await fetch(baseUrl + '/api/widget/' + chatbotId + '/chat', {
        method: 'POST',
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
      const response = await fetch(baseUrl + '/api/widget/' + chatbotId + '/rate', {
        method: 'POST',
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

const BIN_CONFIG = {
// TODOS los proyectos se cargan y guardan aquí
  PROJECTS_BIN_ID: '68af329cae596e708fd92637',
  
// ID del bin para cargar reseñas y comentarios
  REVIEWS_BIN_ID: '68d839ed43b1c97be9523e04',
  
// ID del bin para usuarios de DevCenter
  USERS_BIN_ID: '68d03bc343b1c97be94a869d',
  
// URL base de la API
  API_BASE_URL: 'https://api.jsonbin.io/v3',
  
// ==========================================
// CONFIGURACIÓN DE CACHÉ
// ==========================================
// Configura el tiempo de caché para cada API
// - Si pones 0, no habrá caché (siempre se hará solicitud a la API)
// - Los minutos se convierten automáticamente a milisegundos
// - Los días se convierten automáticamente a milisegundos
//
// Ejemplos:
//   PROJECTS_CACHE_MINUTES: 5    →  Caché de 5 minutos
//   PROJECTS_CACHE_MINUTES: 10   →  Caché de 10 minutos
//   PROJECTS_CACHE_MINUTES: 0    →  Sin caché (siempre actualizado)
//   USERS_CACHE_DAYS: 7          →  Caché de 7 días
//   USERS_CACHE_DAYS: 0          →  Sin caché
// ==========================================
  CACHE: {
    PROJECTS_CACHE_MINUTES: 5,        // Caché de proyectos (en minutos)
    REVIEWS_CACHE_MINUTES: 5,         // Caché de reseñas (en minutos)
    USERS_CACHE_DAYS: 5               // Caché de usuarios DevCenter (en días)
  }
};

// Hacer disponible globalmente
window.BIN_CONFIG = BIN_CONFIG;

// ==========================================
// MONITOR DE API GLOBAL
// ==========================================
// Detectar "DevCenter=api" en cualquier input
(function() {
  let isApiMonitorActive = false;
  let apiCallCount = 0;
  let isMonitorEnabled = false;
  let notificationQueue = [];
  let isProcessingQueue = false;
  
  // Configuración de duraciones por defecto
  const defaultDurations = {
    loading: 1000,    // Cargando/Loading
    success: 3000,    // Resultado/Éxito
    error: 4000,      // Errores
    api: 5000         // Solicitudes a API
  };
  
  // Obtener configuración de duraciones
  function getDurations() {
    const saved = localStorage.getItem('api_notification_durations');
    return saved ? JSON.parse(saved) : defaultDurations;
  }
  
  // Guardar configuración de duraciones
  function saveDurations(durations) {
    localStorage.setItem('api_notification_durations', JSON.stringify(durations));
  }
  
  // Convertir milisegundos a formato legible (s o m)
  function msToReadable(ms) {
    if (ms >= 60000) {
      const minutes = ms / 60000;
      return minutes % 1 === 0 ? `${minutes}m` : `${(ms / 1000)}s`;
    }
    return `${ms / 1000}s`;
  }
  
  // Convertir formato legible (s o m) a milisegundos
  function readableToMs(value) {
    const str = String(value).trim().toLowerCase();
    
    if (str.endsWith('m')) {
      const minutes = parseFloat(str);
      return minutes * 60000;
    } else if (str.endsWith('s')) {
      const seconds = parseFloat(str);
      return seconds * 1000;
    } else {
      // Si no tiene unidad, asumir segundos
      const num = parseFloat(str);
      return num * 1000;
    }
  }
  
  // Detectar tipo de notificación por icono
  function getNotificationType(icon) {
    const loadingIcons = ['📥', '📂', '💾', '🗑️', '🔐', '👥', '👤', '✏️', '🔄', '📝'];
    const successIcons = ['✅', '🎉', '🟢'];
    const errorIcons = ['❌', '⚠️', '🚫', '🔴'];
    const apiIcons = ['🌐'];
    
    if (loadingIcons.includes(icon)) return 'loading';
    if (successIcons.includes(icon)) return 'success';
    if (errorIcons.includes(icon)) return 'error';
    if (apiIcons.includes(icon)) return 'api';
    
    return 'success'; // Por defecto
  }
  
  // Función global de notificaciones (disponible para todos los archivos)
  window.showDevCenterNotification = function(message, icon = '📡', duration = null) {
    if (localStorage.getItem('api_monitor_enabled') !== 'true') return;
    
    // Si no se especifica duración, usar la configurada según el tipo
    if (duration === null) {
      const type = getNotificationType(icon);
      const durations = getDurations();
      duration = durations[type] || 3000;
    }
    
    // Agregar a la cola
    notificationQueue.push({ message, icon, duration });
    
    // Procesar la cola si no se está procesando
    if (!isProcessingQueue) {
      processNotificationQueue();
    }
  };
  
  function processNotificationQueue() {
    if (notificationQueue.length === 0) {
      isProcessingQueue = false;
      return;
    }
    
    isProcessingQueue = true;
    const { message, icon, duration } = notificationQueue.shift();
    
    // Asegurar que los estilos estén cargados
    if (!document.getElementById('api-monitor-styles')) {
      loadNotificationStyles();
    }
    
    const notification = document.createElement('div');
    notification.className = 'api-notification';
    notification.innerHTML = `
      <span class="api-notification-icon">${icon}</span>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => {
        notification.remove();
        // Procesar la siguiente notificación
        processNotificationQueue();
      }, 300);
    }, duration || 3000);
  }
  
  function loadNotificationStyles() {
    const styles = document.createElement('style');
    styles.id = 'api-monitor-styles';
    styles.textContent = `
      .api-notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        z-index: 10001;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        animation: slideDown 0.3s ease-out forwards;
        max-width: 400px;
      }
      
      .api-notification.hide {
        animation: slideUp 0.3s ease-out forwards;
      }
      
      @keyframes slideDown {
        to {
          transform: translateX(-50%) translateY(0);
        }
      }
      
      @keyframes slideUp {
        to {
          transform: translateX(-50%) translateY(-100px);
          opacity: 0;
        }
      }
      
      .api-notification-icon {
        font-size: 18px;
      }
    `;
    document.head.appendChild(styles);
  }
  
  // Detectar cuando se escribe "DevCenter=api" en cualquier input
  document.addEventListener('input', function(e) {
    if (e.target.tagName === 'INPUT' && e.target.value.trim() === 'DevCenter=api') {
      e.target.value = '';
      initApiMonitor();
    }
  });
  
  function initApiMonitor() {
    if (isApiMonitorActive) return;
    
    isApiMonitorActive = true;
    isMonitorEnabled = localStorage.getItem('api_monitor_enabled') === 'true';
    
    // Cargar estilos de notificación
    loadNotificationStyles();
    
    // Crear estilos del panel de monitor
    const panelStyles = document.createElement('style');
    panelStyles.id = 'api-monitor-panel-styles';
    panelStyles.textContent = `
      .api-monitor-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(20, 20, 30, 0.95);
        border: 2px solid #667eea;
        border-radius: 12px;
        padding: 20px;
        z-index: 10000;
        min-width: 280px;
        box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
        backdrop-filter: blur(10px);
      }
      
      .api-monitor-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 15px;
      }
      
      .api-monitor-title {
        font-size: 16px;
        font-weight: 600;
        color: #667eea;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .api-monitor-close {
        background: transparent;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }
      
      .api-monitor-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .api-monitor-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
      }
      
      .api-monitor-label {
        font-size: 14px;
        color: #ccc;
      }
      
      .api-toggle-switch {
        position: relative;
        width: 50px;
        height: 26px;
        background: #444;
        border-radius: 13px;
        cursor: pointer;
        transition: background 0.3s;
      }
      
      .api-toggle-switch.active {
        background: #667eea;
      }
      
      .api-toggle-slider {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        transition: transform 0.3s;
      }
      
      .api-toggle-switch.active .api-toggle-slider {
        transform: translateX(24px);
      }
      
      .api-monitor-stats {
        font-size: 12px;
        color: #888;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .api-config-btn {
        background: rgba(102, 126, 234, 0.2);
        border: 1px solid #667eea;
        color: #667eea;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        margin-top: 10px;
        width: 100%;
        transition: all 0.2s;
      }
      
      .api-config-btn:hover {
        background: rgba(102, 126, 234, 0.3);
      }
      
      .api-config-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(20, 20, 30, 0.98);
        border: 2px solid #667eea;
        border-radius: 12px;
        padding: 25px;
        z-index: 10002;
        min-width: 350px;
        box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
        display: none;
      }
      
      .api-config-panel.show {
        display: block;
      }
      
      .api-config-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .api-config-title {
        font-size: 18px;
        font-weight: 600;
        color: #667eea;
      }
      
      .api-config-close {
        background: transparent;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }
      
      .api-config-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .api-config-item {
        margin-bottom: 15px;
      }
      
      .api-config-label {
        display: block;
        font-size: 13px;
        color: #ccc;
        margin-bottom: 6px;
      }
      
      .api-config-input {
        width: 100%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 8px 12px;
        color: #fff;
        font-size: 14px;
      }
      
      .api-config-input:focus {
        outline: none;
        border-color: #667eea;
      }
      
      .api-config-save {
        background: #667eea;
        border: none;
        color: white;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        width: 100%;
        margin-top: 10px;
        transition: all 0.2s;
      }
      
      .api-config-save:hover {
        background: #5568d3;
      }
      
      .api-config-reset {
        background: transparent;
        border: 1px solid #888;
        color: #888;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        width: 100%;
        margin-top: 8px;
        transition: all 0.2s;
      }
      
      .api-config-reset:hover {
        border-color: #667eea;
        color: #667eea;
      }
    `;
    document.head.appendChild(panelStyles);
    
    // Crear panel
    const panel = document.createElement('div');
    panel.className = 'api-monitor-panel';
    panel.id = 'apiMonitorPanel';
    panel.innerHTML = `
      <div class="api-monitor-header">
        <div class="api-monitor-title">
          <span>📡</span>
          <span>Monitor de API</span>
        </div>
        <button class="api-monitor-close">×</button>
      </div>
      <div class="api-monitor-toggle">
        <span class="api-monitor-label">Notificaciones</span>
        <div class="api-toggle-switch ${isMonitorEnabled ? 'active' : ''}" id="apiToggle">
          <div class="api-toggle-slider"></div>
        </div>
      </div>
      <button class="api-config-btn" id="showConfigBtn">⚙️ Mostrar configuraciones</button>
      <div class="api-monitor-stats">
        <div id="apiStats">Esperando solicitudes...</div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Crear panel de configuración
    const durations = getDurations();
    const configPanel = document.createElement('div');
    configPanel.className = 'api-config-panel';
    configPanel.id = 'apiConfigPanel';
    configPanel.innerHTML = `
      <div class="api-config-header">
        <div class="api-config-title">⚙️ Configuración de Notificaciones</div>
        <button class="api-config-close">×</button>
      </div>
      
      <div class="api-config-item">
        <label class="api-config-label">📥 Cargando/Loading (ej: 1s, 0.5s)</label>
        <input type="text" class="api-config-input" id="loadingDuration" value="${msToReadable(durations.loading)}" placeholder="1s">
      </div>
      
      <div class="api-config-item">
        <label class="api-config-label">✅ Resultado/Éxito (ej: 3s, 1m)</label>
        <input type="text" class="api-config-input" id="successDuration" value="${msToReadable(durations.success)}" placeholder="3s">
      </div>
      
      <div class="api-config-item">
        <label class="api-config-label">❌ Errores (ej: 4s, 0.5m)</label>
        <input type="text" class="api-config-input" id="errorDuration" value="${msToReadable(durations.error)}" placeholder="4s">
      </div>
      
      <div class="api-config-item">
        <label class="api-config-label">🌐 Solicitudes a API (ej: 5s, 1m)</label>
        <input type="text" class="api-config-input" id="apiDuration" value="${msToReadable(durations.api)}" placeholder="5s">
      </div>
      
      <button class="api-config-save" id="saveConfigBtn">💾 Guardar Configuración</button>
      <button class="api-config-reset" id="resetConfigBtn">🔄 Restablecer valores predeterminados</button>
    `;
    
    document.body.appendChild(configPanel);
    
    // Eventos del panel principal
    panel.querySelector('.api-monitor-close').addEventListener('click', () => {
      panel.remove();
      configPanel.remove();
      document.getElementById('api-monitor-styles')?.remove();
      isApiMonitorActive = false;
    });
    
    const toggle = document.getElementById('apiToggle');
    toggle.addEventListener('click', () => {
      isMonitorEnabled = !isMonitorEnabled;
      localStorage.setItem('api_monitor_enabled', isMonitorEnabled);
      toggle.classList.toggle('active', isMonitorEnabled);
      
      window.showDevCenterNotification(
        isMonitorEnabled ? 'Monitor activado' : 'Monitor desactivado',
        isMonitorEnabled ? '🟢' : '🔴'
      );
    });
    
    // Eventos del panel de configuración
    document.getElementById('showConfigBtn').addEventListener('click', () => {
      configPanel.classList.add('show');
    });
    
    configPanel.querySelector('.api-config-close').addEventListener('click', () => {
      configPanel.classList.remove('show');
    });
    
    document.getElementById('saveConfigBtn').addEventListener('click', () => {
      const newDurations = {
        loading: readableToMs(document.getElementById('loadingDuration').value) || 1000,
        success: readableToMs(document.getElementById('successDuration').value) || 3000,
        error: readableToMs(document.getElementById('errorDuration').value) || 4000,
        api: readableToMs(document.getElementById('apiDuration').value) || 5000
      };
      
      saveDurations(newDurations);
      configPanel.classList.remove('show');
      
      window.showDevCenterNotification('Configuración guardada', '✅');
    });
    
    document.getElementById('resetConfigBtn').addEventListener('click', () => {
      saveDurations(defaultDurations);
      
      document.getElementById('loadingDuration').value = msToReadable(defaultDurations.loading);
      document.getElementById('successDuration').value = msToReadable(defaultDurations.success);
      document.getElementById('errorDuration').value = msToReadable(defaultDurations.error);
      document.getElementById('apiDuration').value = msToReadable(defaultDurations.api);
      
      window.showDevCenterNotification('Valores restablecidos', '🔄');
    });
    
    // Interceptar fetch global
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      
      if (isMonitorEnabled && typeof url === 'string' && url.includes('api.jsonbin.io')) {
        const endpoint = url.split('/').pop() || 'API';
        window.showDevCenterNotification(`Solicitud a API: ${endpoint}`, '🌐');
        
        apiCallCount++;
        const statsEl = document.getElementById('apiStats');
        if (statsEl) {
          statsEl.innerHTML = `
            Total: <strong>${apiCallCount}</strong><br>
            Última: ${endpoint}
          `;
        }
      }
      
      return originalFetch.apply(this, args);
    };
    
    console.log('🔍 Monitor de API activado');
  }
  
  // Hacer disponible globalmente
  window.initApiMonitor = initApiMonitor;
})();

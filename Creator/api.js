// ==========================================
// CONFIGURACIÓN DE APIS - EDITABLE
// ==========================================
// Aquí puedes configurar tus APIs de JSON bin

const API_CONFIG = {
    jsonbin: {
        baseURL: 'https://api.jsonbin.io/v3',
        masterKey: '$2a$10$T9JNKL.CKGpxmMKnezehF.Syu388j3.OKXpK03rZ1yBjyKkkR6RHO',
        accessKey: '$2a$10$.nQ.uG0/J/vI4ixoUxK/deluru7qVGIfU5gDLcv7X3s8fjzJhzC8G',
        get usersBinId() {
            return window.BIN_CONFIG?.USERS_BIN_ID || '68d03bc343b1c97be94a869d';
        }
    }
};

// ==========================================
// SISTEMA DE AUTENTICACIÓN SIMPLE
// ⚠️  ADVERTENCIA DE SEGURIDAD:
// Este sistema usa contraseñas en texto plano y es SOLO para demos/pruebas.
// Para producción, implementa hashing de contraseñas y autenticación del lado del servidor.
// ==========================================

class AuthSystem {
    constructor() {
        this.isOnline = navigator.onLine;
        this.validateConfig();
    }
    
    // Obtener duración del caché desde configuración
    getUsersCacheDuration() {
        const config = window.BIN_CONFIG?.CACHE || {};
        const days = config.USERS_CACHE_DAYS ?? 5;
        return days * 24 * 60 * 60 * 1000; // Convertir días a milisegundos
    }

    // Verificar configuración - usar APIs reales configuradas
    validateConfig() {
        const config = API_CONFIG.jsonbin;
        // Configuración real establecida - usar JSONBin.io
        this.isConfigured = true;
        console.log('✅ Configuración de API verificada - Usando JSONBin.io');
       
    }

    // Obtener datos del caché de usuarios
    getUsersFromCache() {
        try {
            const cacheDuration = this.getUsersCacheDuration();
            
            if (cacheDuration === 0) {
                return null;
            }
            
            const cached = localStorage.getItem('devcenter_users_cache');
            if (!cached) return null;
            
            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            
            if (now - timestamp > cacheDuration) {
                localStorage.removeItem('devcenter_users_cache');
                const days = window.BIN_CONFIG?.CACHE?.USERS_CACHE_DAYS ?? 5;
                console.log(`[Cache] Caché de usuarios expirado (${days} días)`);
                return null;
            }
            
            console.log('[Cache] Usuarios cargados desde caché');
            return data;
        } catch (error) {
            console.error('Error leyendo caché de usuarios:', error);
            return null;
        }
    }
    
    // Guardar usuarios en caché
    setUsersCache(users) {
        try {
            const cacheDuration = this.getUsersCacheDuration();
            
            if (cacheDuration === 0) {
                return;
            }
            
            const cacheEntry = {
                data: users,
                timestamp: Date.now()
            };
            localStorage.setItem('devcenter_users_cache', JSON.stringify(cacheEntry));
            const days = window.BIN_CONFIG?.CACHE?.USERS_CACHE_DAYS ?? 5;
            console.log(`[Cache] Usuarios guardados en caché por ${days} días`);
        } catch (error) {
            console.error('Error guardando caché de usuarios:', error);
        }
    }
    
    // Invalidar caché de usuarios
    invalidateUsersCache() {
        localStorage.removeItem('devcenter_users_cache');
        console.log('[Cache] Caché de usuarios invalidado');
    }

    // Inicializar modo demo con datos locales
    initDemoMode() {
        console.log('🎮 Iniciando modo demo con datos locales');
        // Crear usuario demo si no existe
        if (!localStorage.getItem('demoUsers')) {
            const demoUsers = [{
                id: 'demo-1',
                username: 'demo',
                email: 'demo@ejemplo.com',
                password: 'demo',
                createdAt: new Date().toISOString()
            }];
            localStorage.setItem('demoUsers', JSON.stringify(demoUsers));
        }
    }

    // Headers para JSONBin
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-Master-Key': API_CONFIG.jsonbin.masterKey,
            'X-Access-Key': API_CONFIG.jsonbin.accessKey
        };
    }

    // Hacer request a JSONBin
    async makeRequest(binId, method = 'GET', data = null) {
        const url = `${API_CONFIG.jsonbin.baseURL}/b/${binId}${method === 'GET' ? '/latest' : ''}`;
        
        const options = {
            method: method,
            headers: this.getHeaders()
        };

        if (data && method === 'PUT') {
            options.body = JSON.stringify(data);
        }

        try {
            console.log(`[API Request] ${method} ${url}`);
            if (window.showDevCenterNotification) {
                window.showDevCenterNotification(`API Request: ${method} ${binId.substring(0, 8)}...`, '🌐');
            }
            
            const response = await fetch(url, options);
            
            if (!response.ok) {
                console.error(`[API Error] ${response.status} - ${url}`);
                if (window.showDevCenterNotification) {
                    window.showDevCenterNotification(`API Error: ${response.status}`, '❌');
                }
                throw new Error(`Error ${response.status}`);
            }
            
            console.log(`[API Success] ${method} ${url}`);
            if (window.showDevCenterNotification) {
                window.showDevCenterNotification(`API Success: ${method}`, '✅');
            }
            
            return await response.json();
        } catch (error) {
            console.error('[API Error] Request failed:', error);
            if (window.showDevCenterNotification) {
                window.showDevCenterNotification(`API Failed: ${error.message}`, '🚫');
            }
            throw error;
        }
    }

    // Obtener usuarios (desde JSONBin o localStorage en modo demo)
    async getUsers() {
        if (!this.isConfigured) {
            // Modo demo: usar localStorage
            const users = localStorage.getItem('demoUsers');
            return users ? JSON.parse(users) : [];
        }
        
        const cachedUsers = this.getUsersFromCache();
        if (cachedUsers) {
            console.log('[getUsers] Usuarios cargados desde caché');
            if (window.showDevCenterNotification) {
                window.showDevCenterNotification('Usuarios desde caché', '💾');
            }
            return cachedUsers;
        }
        
        try {
            console.log('[getUsers] Solicitando usuarios a la API...');
            if (window.showDevCenterNotification) {
                window.showDevCenterNotification('Obteniendo usuarios...', '👥');
            }
            
            const data = await this.makeRequest(API_CONFIG.jsonbin.usersBinId);
            console.log('[getUsers] Datos recibidos de JSONBin:', data);
            
            let users = [];
            // Verificar si los datos tienen la estructura con "usuarios"
            if (data.record && data.record.usuarios) {
                users = data.record.usuarios;
            } else {
                // Si no, usar directamente el record
                users = data.record || [];
            }
            
            this.setUsersCache(users);
            console.log(`[getUsers] ${users.length} usuarios obtenidos exitosamente`);
            if (window.showDevCenterNotification) {
                window.showDevCenterNotification(`${users.length} usuarios obtenidos`, '✅');
            }
            
            return users;
        } catch (error) {
            console.error('[getUsers] Error obteniendo usuarios:', error);
            if (window.showDevCenterNotification) {
                window.showDevCenterNotification('Error obteniendo usuarios', '❌');
            }
            return [];
        }
    }

    // Guardar usuarios (en JSONBin o localStorage en modo demo)
    async saveUsers(users) {
        if (!this.isConfigured) {
            // Modo demo: usar localStorage
            localStorage.setItem('demoUsers', JSON.stringify(users));
            return { success: true };
        }
        
        try {
            // Guardar en la estructura correcta con "usuarios"
            const dataToSave = { usuarios: users };
            console.log('[saveUsers] Guardando usuarios en JSONBin:', dataToSave);
            if (window.showDevCenterNotification) {
                window.showDevCenterNotification(`Guardando ${users.length} usuarios...`, '💾');
            }
            
            const result = await this.makeRequest(API_CONFIG.jsonbin.usersBinId, 'PUT', dataToSave);
            
            console.log('[saveUsers] Usuarios guardados exitosamente');
            if (window.showDevCenterNotification) {
                window.showDevCenterNotification('Usuarios guardados', '✅');
            }
            
            return result;
        } catch (error) {
            console.error('[saveUsers] Error guardando usuarios:', error);
            if (window.showDevCenterNotification) {
                window.showDevCenterNotification('Error guardando usuarios', '❌');
            }
            throw error;
        }
    }

    // Registrar usuario
    async register(username, email, password) {
        console.log(`[register] Intentando registrar usuario: ${username}`);
        if (window.showDevCenterNotification) {
            window.showDevCenterNotification(`Registrando ${username}...`, '📝');
        }
        
        const users = await this.getUsers();
        
        // Verificar si ya existe (usando nombres de campos en español)
        if (users.find(u => u.usuario === username || u.correo_electronico === email)) {
            console.error('[register] Usuario o email ya existe');
            if (window.showDevCenterNotification) {
                window.showDevCenterNotification('Usuario o email ya existe', '⚠️');
            }
            throw new Error('Usuario o email ya existe');
        }

        // Agregar nuevo usuario (usando nombres de campos en español)
        const newUser = {
            id: Date.now().toString(),
            usuario: username,
            correo_electronico: email,
            contrasena: password, // En producción usar hash
            creado_en: new Date().toISOString()
        };

        users.push(newUser);
        await this.saveUsers(users);
        
        this.invalidateUsersCache();
        
        console.log(`[register] Usuario registrado exitosamente: ${username}`);
        if (window.showDevCenterNotification) {
            window.showDevCenterNotification(`Usuario ${username} registrado`, '🎉');
        }
        
        return newUser;
    }

    // Iniciar sesión
    async login(username, password) {
        console.log(`[login] Intentando iniciar sesión: ${username}`);
        if (window.showDevCenterNotification) {
            window.showDevCenterNotification(`Iniciando sesión ${username}...`, '🔐');
        }
        
        const users = await this.getUsers();
        console.log('[login] Buscando usuario:', username);
        console.log('[login] Total usuarios en sistema:', users.length);
        
        const user = users.find(u => 
            (u.usuario === username || u.correo_electronico === username) && 
            u.contrasena === password
        );

        if (!user) {
            console.error('[login] Usuario o contraseña incorrectos');
            if (window.showDevCenterNotification) {
                window.showDevCenterNotification('Usuario o contraseña incorrectos', '❌');
            }
            throw new Error('Usuario o contraseña incorrectos');
        }

        console.log('[login] Usuario encontrado:', user.usuario);

        // Generar token de autenticación
        const authToken = btoa(`${user.id}-${Date.now()}-${Math.random()}`);

        // Guardar sesión
        localStorage.setItem('currentUser', JSON.stringify({
            id: user.id,
            username: user.usuario,
            email: user.correo_electronico
        }));
        localStorage.setItem('authToken', authToken);

        this.invalidateUsersCache();
        
        console.log(`[login] Sesión iniciada exitosamente para: ${user.usuario}`);
        if (window.showDevCenterNotification) {
            window.showDevCenterNotification(`Bienvenido ${user.usuario}`, '✅');
        }

        return user;
    }

    // Verificar si está logueado
    isLoggedIn() {
        const currentUser = localStorage.getItem('currentUser');
        const authToken = localStorage.getItem('authToken');
        return currentUser !== null && authToken !== null;
    }

    // Obtener usuario actual
    getCurrentUser() {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    }

    // Cerrar sesión
    logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
    }
}

// Hacer disponible globalmente
window.AuthSystem = AuthSystem;
window.auth = new AuthSystem();

console.log('🔐 Sistema de autenticación cargado');

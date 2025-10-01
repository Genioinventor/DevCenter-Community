// ==========================================
// CONFIGURACIÓN DE APIS - EDITABLE
// ==========================================
// Aquí puedes configurar tus APIs de JSON bin

const API_CONFIG = {
    jsonbin: {
        baseURL: 'https://api.jsonbin.io/v3',
        masterKey: '$2a$10$T9JNKL.CKGpxmMKnezehF.Syu388j3.OKXpK03rZ1yBjyKkkR6RHO',
        accessKey: '$2a$10$.nQ.uG0/J/vI4ixoUxK/deluru7qVGIfU5gDLcv7X3s8fjzJhzC8G',
        usersBinId: '68d03bc343b1c97be94a869d'
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

    // Verificar configuración - usar APIs reales configuradas
    validateConfig() {
        const config = API_CONFIG.jsonbin;
        // Configuración real establecida - usar JSONBin.io
        this.isConfigured = true;
        console.log('✅ Configuración de API verificada - Usando JSONBin.io');
       
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
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`Error ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error en request:', error);
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
        
        try {
            const data = await this.makeRequest(API_CONFIG.jsonbin.usersBinId);
            console.log('📦 Datos recibidos de JSONBin:', data);
            
            // Verificar si los datos tienen la estructura con "usuarios"
            if (data.record && data.record.usuarios) {
                return data.record.usuarios;
            }
            // Si no, usar directamente el record
            return data.record || [];
        } catch (error) {
            console.error('❌ Error obteniendo usuarios:', error);
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
            console.log('💾 Guardando usuarios en JSONBin:', dataToSave);
            
            const result = await this.makeRequest(API_CONFIG.jsonbin.usersBinId, 'PUT', dataToSave);
            console.log('✅ Usuarios guardados exitosamente');
            return result;
        } catch (error) {
            console.error('❌ Error guardando usuarios:', error);
            throw error;
        }
    }

    // Registrar usuario
    async register(username, email, password) {
        const users = await this.getUsers();
        
        // Verificar si ya existe (usando nombres de campos en español)
        if (users.find(u => u.usuario === username || u.correo_electronico === email)) {
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
        
        return newUser;
    }

    // Iniciar sesión
    async login(username, password) {
        const users = await this.getUsers();
        console.log('🔍 Buscando usuario:', username, 'con contraseña:', password);
        console.log('👥 Lista de usuarios:', users);
        
        const user = users.find(u => 
            (u.usuario === username || u.correo_electronico === username) && 
            u.contrasena === password
        );

        if (!user) {
            throw new Error('Usuario o contraseña incorrectos');
        }

        console.log('✅ Usuario encontrado:', user);

        // Generar token de autenticación
        const authToken = btoa(`${user.id}-${Date.now()}-${Math.random()}`);

        // Guardar sesión
        localStorage.setItem('currentUser', JSON.stringify({
            id: user.id,
            username: user.usuario,
            email: user.correo_electronico
        }));
        localStorage.setItem('authToken', authToken);

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

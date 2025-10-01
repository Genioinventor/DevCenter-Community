class PromotionsManager {
  constructor() {
    this.config = null;
    this.viewsData = null;
    this.initialized = false;
  }

  async init() {
    try {
      const configResponse = await fetch('promotions-config.json');
      this.config = await configResponse.json();
      
      this.config.promotions = this.config.promotions.map((promo, index) => {
        if (!promo.id) {
          promo.id = this.generateId(promo.projectName, index);
          console.log('[Promociones] ID generado automáticamente:', promo.id, 'para', promo.projectName);
        }
        return promo;
      });
      
      this.loadViewsFromLocalStorage();
      
      if (!this.viewsData || !this.viewsData.dailyViews) {
        this.viewsData = { dailyViews: [] };
        console.log('[Promociones] Datos de visualización inicializados vacíos');
      } else {
        console.log('[Promociones] Datos cargados desde localStorage:', this.viewsData.dailyViews.length, 'registros');
      }
      
      this.initialized = true;
      
      this.resetDailyCountersIfNeeded();
      
      console.log('[Promociones] Sistema inicializado con', this.config.promotions.length, 'promociones');
      return true;
    } catch (error) {
      console.error('[Promociones] Error al inicializar:', error);
      return false;
    }
  }

  generateId(projectName, index) {
    const slug = projectName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `promo_${slug}_${index}`;
  }

  getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  resetDailyCountersIfNeeded() {
    const today = this.getTodayString();
    
    this.viewsData.dailyViews = this.viewsData.dailyViews.filter(view => {
      return view.date === today;
    });

    this.saveViews();
  }

  async saveViews() {
    try {
      localStorage.setItem('promotions_views', JSON.stringify(this.viewsData));
    } catch (error) {
      console.error('[Promociones] Error al guardar visualizaciones:', error);
    }
  }

  loadViewsFromLocalStorage() {
    try {
      const saved = localStorage.getItem('promotions_views');
      if (saved) {
        this.viewsData = JSON.parse(saved);
      }
    } catch (error) {
      console.error('[Promociones] Error al cargar desde localStorage:', error);
    }
  }

  isPromotionActive(promotion) {
    if (!promotion.active) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(promotion.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(promotion.endDate);
    endDate.setHours(23, 59, 59, 999);

    return today >= startDate && today <= endDate;
  }

  getViewCount(promotionId) {
    const today = this.getTodayString();
    const viewRecord = this.viewsData.dailyViews.find(
      v => v.promotionId === promotionId && v.date === today
    );
    return viewRecord ? viewRecord.count : 0;
  }

  hasReachedLimit(promotionId, dailyLimit) {
    const currentViews = this.getViewCount(promotionId);
    return currentViews >= dailyLimit;
  }

  incrementViewCount(promotionId) {
    const today = this.getTodayString();
    const viewRecord = this.viewsData.dailyViews.find(
      v => v.promotionId === promotionId && v.date === today
    );

    if (viewRecord) {
      viewRecord.count++;
    } else {
      this.viewsData.dailyViews.push({
        promotionId: promotionId,
        date: today,
        count: 1,
        lastResetAt: new Date().toISOString()
      });
    }

    this.saveViews();
  }

  getActivePromotions() {
    if (!this.initialized) {
      console.warn('[Promociones] Sistema no inicializado');
      return [];
    }

    const activePromotions = this.config.promotions
      .filter(promo => {
        const isActive = this.isPromotionActive(promo);
        const hasReachedLimit = this.hasReachedLimit(promo.id, promo.dailyViewLimit);
        
        return isActive && !hasReachedLimit;
      })
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));

    activePromotions.forEach(promo => {
      this.incrementViewCount(promo.id);
    });

    const viewStats = activePromotions.map(p => ({
      id: p.id,
      views: this.getViewCount(p.id),
      limit: p.dailyViewLimit
    }));

    console.log('[Promociones] Promociones activas:', activePromotions.length);
    console.log('[Promociones] Estadísticas detalladas:', viewStats.map(v => `${v.id}: ${v.views}/${v.limit}`).join(', '));

    return activePromotions;
  }

  getPromotionStats() {
    if (!this.initialized) return [];

    return this.config.promotions.map(promo => {
      const viewCount = this.getViewCount(promo.id);
      const isActive = this.isPromotionActive(promo);
      const hasReachedLimit = this.hasReachedLimit(promo.id, promo.dailyViewLimit);

      return {
        id: promo.id,
        projectName: promo.projectName,
        promoLabel: promo.promoLabel,
        startDate: promo.startDate,
        endDate: promo.endDate,
        dailyViewLimit: promo.dailyViewLimit,
        currentViews: viewCount,
        isActive: isActive,
        hasReachedLimit: hasReachedLimit,
        status: !isActive ? 'Inactiva' : hasReachedLimit ? 'Límite alcanzado' : 'Activa'
      };
    });
  }
}

const promotionsManager = new PromotionsManager();
window.promotionsManager = promotionsManager;

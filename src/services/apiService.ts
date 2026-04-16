// Service API sécurisé pour Check-in Express

class ApiService {
  private apiKey: string
  private baseUrl: string

  constructor() {
    // Récupérer la clé API depuis les variables d'environnement
    this.apiKey = import.meta.env.VITE_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('API Key non trouvée dans les variables d\'environnement')
    }
    
    // Configuration de base URL si nécessaire
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'
  }

  /**
   * Vérifie si la clé API est disponible
   */
  isApiKeyAvailable(): boolean {
    return !!this.apiKey
  }

  /**
   * Effectue un appel API sécurisé
   */
  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.isApiKeyAvailable()) {
      throw new Error('Clé API non configurée')
    }

    const url = `${this.baseUrl}${endpoint}`
    
    const defaultHeaders = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const config = {
      ...options,
      headers: defaultHeaders,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      console.error('Erreur lors de l\'appel API:', error)
      throw error
    }
  }

  /**
   * Exemple: Traitement OCR
   */
  async processDocument(imageData: FormData | File): Promise<any> {
    try {
      const response = await this.makeRequest('/ocr/process', {
        method: 'POST',
        body: imageData,
        // Ne pas définir Content-Type pour FormData (le navigateur le fait automatiquement)
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })
      
      return await response.json()
    } catch (error) {
      console.error('Erreur lors du traitement OCR:', error)
      throw error
    }
  }

  /**
   * Exemple: Validation de document
   */
  async validateDocument(documentData: any): Promise<any> {
    try {
      const response = await this.makeRequest('/documents/validate', {
        method: 'POST',
        body: JSON.stringify(documentData),
      })
      
      return await response.json()
    } catch (error) {
      console.error('Erreur lors de la validation:', error)
      throw error
    }
  }
}

// Exporter une instance singleton
export const apiService = new ApiService()

// Exporter le type pour TypeScript
export type ApiServiceType = typeof apiService

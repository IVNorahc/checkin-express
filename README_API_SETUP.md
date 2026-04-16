# Configuration de l'API sécurisée - Check-in Express

## Étapes de configuration

### 1. Créer le fichier `.env.local`

À la racine du projet, créez un fichier `.env.local` avec le contenu suivant :

```bash
# API Configuration
VITE_API_KEY=sk-ws-01-EBhmA3BvzAVHkHIBjumY-gOH6sWML75fJNoapEt_1tGsFmTzxbyU8hzua1yyKY7zhITVvAfDr0RrTFDyZAxFjl2CTZD8Nw

# Supabase (conservez vos valeurs existantes)
VITE_SUPABASE_URL=votre-url-supabase
VITE_SUPABASE_ANON_KEY=votre-cle-anon-supabase

# Configuration API (optionnel)
VITE_API_BASE_URL=https://votre-api-url.com
```

### 2. Redémarrer l'application

Après avoir créé le fichier `.env.local`, redémarrez votre application :

```bash
npm run dev
```

### 3. Fonctionnement

L'application utilise maintenant une double stratégie d'API :

1. **API sécurisée en priorité** : Utilise votre clé API pour le traitement OCR
2. **Fallback sur Gemini** : Si l'API sécurisée n'est pas disponible ou échoue

### 4. Sécurité

- La clé API est stockée dans `.env.local` (protégé par `.gitignore`)
- Elle n'est jamais exposée dans le code source
- Elle n'est pas incluse dans le build de production

### 5. Service API

Le service `apiService` gère :
- L'authentification Bearer
- Les erreurs réseau
- La transformation des réponses
- La validation des clés API

### 6. Surveillance

Dans la console du navigateur, vous verrez des messages comme :
- `"API Key non disponible, utilisation de Gemini"` : si la clé n'est pas configurée
- `"Fallback sur Gemini API"` : si l'API sécurisée échoue
- `"Erreur avec l'API sécurisée"` : si l'API retourne une erreur

## Dépannage

### Problème : "API Key non disponible"

**Solution** : Vérifiez que le fichier `.env.local` existe et contient `VITE_API_KEY`

### Problème : Erreur réseau

**Solution** : Vérifiez l'URL de l'API dans `VITE_API_BASE_URL`

### Problème : Quota dépassé

**Solution** : L'application basculera automatiquement sur Gemini

## Notes importantes

- Ne partagez jamais votre clé API
- Le fichier `.env.local` est déjà protégé par `.gitignore`
- En production, utilisez des variables d'environnement réelles
- L'application fonctionne même sans l'API sécurisée (fallback Gemini)

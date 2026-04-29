import React from 'react';
import { getPlanDisplayName, getPlanPrice } from '../utils/planFeatures';

interface UpgradePromptProps {
  feature: string;
  currentPlan?: string;
  requiredPlan?: string;
  message?: string;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({ 
  feature, 
  currentPlan = 'trial',
  requiredPlan = 'business',
  message 
}) => {
  const getUpgradeMessage = () => {
    if (message) return message;
    
    if (currentPlan === 'trial') {
      return `Cette fonctionnalité "${feature}" n'est pas disponible dans la version d'essai. Passez à un abonnement Starter ou Business pour y accéder.`;
    }
    
    if (currentPlan === 'starter' && requiredPlan === 'business') {
      return `Cette fonctionnalité "${feature}" est réservée au plan Business. Passez à Business pour y accéder.`;
    }
    
    return `Cette fonctionnalité "${feature}" nécessite un abonnement supérieur.`;
  };

  const getUpgradeButton = () => {
    if (currentPlan === 'trial') {
      return (
        <button
          onClick={() => window.location.href = '/subscribe'}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Passer à Starter ({getPlanPrice('starter')}{'\u20ac'}/mois)
        </button>
      );
    }
    
    if (currentPlan === 'starter' && requiredPlan === 'business') {
      return (
        <button
          onClick={() => window.location.href = '/subscribe'}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Passer à Business ({getPlanPrice('business')}{'\u20ac'}/mois)
        </button>
      );
    }
    
    return (
      <button
        onClick={() => window.location.href = '/subscribe'}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Voir les abonnements
      </button>
    );
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
      <div className="mb-4">
        <svg className="w-12 h-12 text-yellow-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Fonctionnalité Premium
        </h3>
      </div>
      
      <p className="text-yellow-700 mb-4">
        {getUpgradeMessage()}
      </p>
      
      <div className="space-y-2">
        {getUpgradeButton()}
        <p className="text-sm text-yellow-600">
          Contactez-nous à{' '}
          <a href="mailto:contact@percepta.io" className="underline hover:text-yellow-800">
            contact@percepta.io
          </a>{' '}
          pour plus d'informations
        </p>
      </div>
    </div>
  );
};

export default UpgradePrompt;

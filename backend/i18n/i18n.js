const i18n = require('i18n');
const path = require('path');

// Configure i18n
i18n.configure({
  locales: ['en', 'es', 'fr', 'de', 'hi'],
  defaultLocale: 'en',
  directory: path.join(__dirname, 'locales'),
  register: global,
  autoReload: true,
  syncFiles: true,
});

// Translation function
const t = (key, locale = 'en') => {
  // Simple translation dictionary
  const translations = {
    en: {
      'errors.unauthorized': 'Unauthorized access',
      'errors.serverError': 'Internal server error',
      'errors.required': 'Required field is missing',
      'auth.userNotFound': 'User not found',
      'user.analysisNotFound': 'Analysis not found',
      'user.analysisDeleted': 'Analysis deleted successfully',
      'auth.invalidCredentials': 'Invalid credentials',
      'auth.userAlreadyExists': 'User already exists',
      'auth.registrationSuccess': 'Registration successful',
      'auth.loginSuccess': 'Login successful',
      'auth.logoutSuccess': 'Logout successful',
      'lawyer.notFound': 'Lawyer not found',
      'lawyer.fetchSuccess': 'Lawyers fetched successfully',
      'consultant.notFound': 'Consultant not found',
      'consultant.fetchSuccess': 'Consultants fetched successfully',
      'chat.notFound': 'Chat not found',
      'chat.messageSent': 'Message sent successfully',
      'forum.postCreated': 'Forum post created successfully',
      'forum.postDeleted': 'Forum post deleted successfully',
      'forum.replyCreated': 'Reply created successfully',
    },
    es: {
      'errors.unauthorized': 'Acceso no autorizado',
      'errors.serverError': 'Error interno del servidor',
      'errors.required': 'Falta un campo requerido',
      'auth.userNotFound': 'Usuario no encontrado',
      'user.analysisNotFound': 'Análisis no encontrado',
      'user.analysisDeleted': 'Análisis eliminado exitosamente',
    },
    fr: {
      'errors.unauthorized': 'Accès non autorisé',
      'errors.serverError': 'Erreur interne du serveur',
      'errors.required': 'Champ obligatoire manquant',
      'auth.userNotFound': 'Utilisateur non trouvé',
      'user.analysisNotFound': 'Analyse non trouvée',
      'user.analysisDeleted': 'Analyse supprimée avec succès',
    },
    de: {
      'errors.unauthorized': 'Nicht autorisierter Zugriff',
      'errors.serverError': 'Interner Serverfehler',
      'errors.required': 'Erforderliches Feld fehlt',
      'auth.userNotFound': 'Benutzer nicht gefunden',
      'user.analysisNotFound': 'Analyse nicht gefunden',
      'user.analysisDeleted': 'Analyse erfolgreich gelöscht',
    },
    hi: {
      'errors.unauthorized': 'अनधिकृत पहुंच',
      'errors.serverError': 'आंतरिक सर्वर त्रुटि',
      'errors.required': 'आवश्यक क्षेत्र अनुपलब्ध है',
      'auth.userNotFound': 'उपयोगकर्ता नहीं मिला',
      'user.analysisNotFound': 'विश्लेषण नहीं मिला',
      'user.analysisDeleted': 'विश्लेषण सफलतापूर्वक हटाया गया',
    },
  };

  const localeTranslations = translations[locale] || translations['en'];
  return localeTranslations[key] || key; // Return key as fallback if translation not found
};

module.exports = {
  i18n,
  t,
};

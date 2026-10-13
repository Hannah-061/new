import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import zhHant from './zh-Hant.json'

/** 瀏覽器語言是中文就用繁體中文，其他一律用英文 */
function detectLanguage(): 'zh-Hant' | 'en' {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  return languages[0]?.toLowerCase().startsWith('zh') ? 'zh-Hant' : 'en'
}

const language = detectLanguage()

void i18n.use(initReactI18next).init({
  resources: { 'zh-Hant': { translation: zhHant }, en: { translation: en } },
  lng: language,
  fallbackLng: 'zh-Hant',
  interpolation: { escapeValue: false }, // React 已經會處理跳脫
})

document.documentElement.lang = language
document.title = i18n.t('app.title')

export default i18n

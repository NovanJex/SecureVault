import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { lang } from './i18n';

// 跟随系统 locale 设置文档语言（影响拼写检查、字体回退、无障碍朗读）
document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

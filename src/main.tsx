import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// React 19 owns metadata after mounting, but createRoot does not hydrate the
// build-time shell. Remove only our seeded tags to avoid duplicate canonicals,
// descriptions and robots directives; leave fonts, viewport and third parties.
document.head.querySelectorAll('[data-seo-static="true"], [data-rh="true"]').forEach((tag) => tag.remove());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
// czcionki wbudowane w grę — zero zapytań do zewnętrznych serwerów (Family Link: jeden zatwierdzony adres)
import '@fontsource/alfa-slab-one/latin-400.css'
import '@fontsource/alfa-slab-one/latin-ext-400.css'
import '@fontsource/rubik/latin-400.css'
import '@fontsource/rubik/latin-ext-400.css'
import '@fontsource/rubik/latin-600.css'
import '@fontsource/rubik/latin-ext-600.css'
import '@fontsource/rubik/latin-700.css'
import '@fontsource/rubik/latin-ext-700.css'
import '@fontsource/rubik/latin-800.css'
import '@fontsource/rubik/latin-ext-800.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

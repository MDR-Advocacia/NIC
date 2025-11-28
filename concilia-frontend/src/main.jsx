// src/main.jsx
// ATUALIZADO: Com o ThemeProvider

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx'; // 1. IMPORTAR O NOVO TEMA

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        {/* 2. ENVOLVER TUDO COM O THEMEPROVIDER (por fora) */}
        <ThemeProvider>
            <BrowserRouter>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </BrowserRouter>
        </ThemeProvider>
    </React.StrictMode>,
);
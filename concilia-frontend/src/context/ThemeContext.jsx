// src/context/ThemeContext.jsx
// NOVO ARQUIVO - O "Cérebro" que controla o Light/Dark Mode

import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Define o valor padrão (começamos com 'light', como você pediu)
const ThemeContext = createContext({
    theme: 'light',
    toggleTheme: () => {},
});

// 2. Cria o Provedor (o "wrapper")
export const ThemeProvider = ({ children }) => {
    // 3. Cria o estado para o tema, lendo do localStorage para salvar a escolha
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        // Se o usuário já tiver uma escolha salva, usa ela.
        // Se não, o padrão é 'light'.
        return savedTheme || 'light';
    });

    // 4. Esta é a "mágica":
    useEffect(() => {
        const body = window.document.body;
        
        // Remove o tema antigo
        body.classList.remove('light', 'dark');
        
        // Adiciona o tema atual
        body.classList.add(theme);
        
        // Salva a escolha no localStorage
        localStorage.setItem('theme', theme);
    }, [theme]); // Roda sempre que o 'theme' mudar

    // 5. Função que o botão de "interruptor" vai chamar
    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// 6. Hook customizado para facilitar o uso em outros componentes
export const useTheme = () => useContext(ThemeContext);
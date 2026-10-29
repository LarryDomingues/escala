import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  const applyTheme = (newTheme) => {
    const html = document.documentElement;
    const body = document.body;

    if (newTheme === 'dark') {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
      html.style.backgroundColor = '#020617';
      if (body) body.style.backgroundColor = '#020617';
    } else {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
      html.style.backgroundColor = '#f8fafc';
      if (body) body.style.backgroundColor = '#f8fafc';
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
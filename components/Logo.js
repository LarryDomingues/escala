import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function Logo({ 
  className = 'h-12 w-auto object-contain', 
  alt = 'Louvor',
  fallback = true 
}) {
  const { theme, mounted } = useTheme();
  const [errorClaro, setErrorClaro] = useState(false);
  const [errorEscuro, setErrorEscuro] = useState(false);

  // Enquanto não montou, usa a logo clara (evita flash)
  const isDark = mounted && theme === 'dark';

  // Se a logo escura falhar, usa a clara como fallback
  const src = isDark 
    ? (errorEscuro ? '/logo.png' : '/logonoturno.png')
    : '/logo.png';

  // Se ambas falharem, mostra texto
  if (errorClaro && errorEscuro) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-900 dark:bg-white rounded-lg px-3 text-white dark:text-slate-900 font-semibold text-sm`}>
        ♪
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (isDark) {
          setErrorEscuro(true);
        } else {
          setErrorClaro(true);
        }
      }}
    />
  );
}
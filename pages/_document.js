import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && prefersDark)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                    document.documentElement.style.backgroundColor = '#020617';
                  } else {
                    document.documentElement.style.backgroundColor = '#f8fafc';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Escala Louvor" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#020617" />

        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />

        <meta property="og:title" content="🎵 Escala de Louvor" />
        <meta property="og:description" content="Sistema de Escala do Ministério de Louvor" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/logo.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="🎵 Escala de Louvor" />
        <meta name="twitter:description" content="Sistema de Escala do Ministério de Louvor" />
        <meta name="twitter:image" content="/logo.png" />
      </Head>
      <body className="bg-slate-50 dark:bg-slate-950 transition-colors">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
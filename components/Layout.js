import MenuLateral from './MenuLateral';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <MenuLateral />
      <main className="md:ml-64 pt-14 md:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
import MenuLateral from './MenuLateral';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <MenuLateral />
      <main className="flex-1 ml-0 md:ml-64 pt-16 md:pt-0 pb-20 md:pb-6 px-3 md:px-6 max-w-[100vw] overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 text-white">
            Art Studio
          </h1>
          <p className="text-2xl text-gray-400">
            Rezervačný systém
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Link 
            href="/login"
            className="group p-12 bg-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all border-4 border-gray-900 hover:scale-105"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🔑</div>
              <h2 className="text-3xl font-bold mb-3 text-black">
                Prihlásenie
              </h2>
              <p className="text-gray-600 text-lg">
                Máte už účet? Prihláste sa
              </p>
            </div>
          </Link>

          <Link 
            href="/register"
            className="group p-12 bg-black rounded-2xl shadow-2xl hover:shadow-3xl transition-all border-4 border-white hover:scale-105"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">✨</div>
              <h2 className="text-3xl font-bold mb-3 text-white">
                Registrácia
              </h2>
              <p className="text-gray-400 text-lg">
                Nový používateľ? Zaregistrujte sa
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-8 flex justify-center gap-6">
          <a 
            href="https://www.instagram.com/kadernictvo_artstudio/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-16 h-16 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
            aria-label="Instagram"
          >
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <a 
            href="https://www.facebook.com/p/Kadernictvoartstudio-61555601293628/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
            aria-label="Facebook"
          >
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a 
            href="https://www.kadernictvoartstudio.sk/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
            aria-label="Web stránka"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
            </svg>
          </a>
        </div>
      </div>
    </main>
  )
}

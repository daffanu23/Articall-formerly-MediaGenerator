'use client';

import NewsGraphicGenerator from '@/components/NewsGraphicGenerator';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-4">
          AI News Media Generator
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Ubah teks artikel berita Anda menjadi kumpulan slide visual siap post ke Instagram secara otomatis menggunakan kekuatan AI.
        </p>
      </div>
      
      <NewsGraphicGenerator />
    </main>
  );
}

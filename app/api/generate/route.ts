import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

function getMediaSchema(slideCount: string, wordCount: string) {
  const slideInstruction = slideCount === 'auto' 
    ? "Buatlah jumlah slide sesuai kebutuhan (ideal 3-6 elemen array)." 
    : `Buatlah TEPAT ${slideCount} slide/elemen array (tidak boleh kurang atau lebih).`;

  let wordCountInstruction = "";
  if (wordCount === 'singkat') {
    wordCountInstruction = "Tiap slide (elemen) WAJIB berisi sekitar 20-30 kata (1-2 kalimat). Cocok untuk gaya tulisan yang cepat dan sangat ringkas.";
  } else if (wordCount === 'sedang') {
    wordCountInstruction = "Tiap slide (elemen) WAJIB berisi sekitar 40-50 kata (3-4 kalimat). Ini adalah ukuran optimal untuk mengisi 40% porsi layar agar tidak terlihat terlalu kosong namun tetap nyaman dibaca.";
  } else if (wordCount === 'panjang') {
    wordCountInstruction = "Tiap slide (elemen) WAJIB berisi sekitar 60-80 kata (1 paragraf padat). Teks harus cukup padat untuk memenuhi 60-70% layar slide.";
  } else {
    wordCountInstruction = "Tiap slide (elemen) WAJIB berisi tulisan yang cukup panjang (sekitar 4-5 baris kalimat atau 1 paragraf padat) untuk mengisi 40% porsi teks di layar.";
  }

  return z.object({
    cover: z.string().describe("Judul berita clickbait (hook) yang sangat menarik, singkat (maksimal 7 kata), gunakan tag <br> untuk pindah baris agar layoutnya bagus. HURUF KAPITAL SEMUA."),
    contents: z.array(z.string()).describe(`Array berisi isi berita. ${slideInstruction} INSTRUKSI KEPADATAN TEKS: ${wordCountInstruction}`),
    outro: z.string().describe("Kalimat penutup yang merangkum berita atau Call to Action (ajakan membaca) ke website.")
  });
}

const SYSTEM_PROMPT = `Kamu adalah Editor Senior Media Sosial yang ahli merangkum berita panjang menjadi format Microblog / Carousel Instagram yang viral dan informatif. 
Tugasmu: Rangkum artikel berita berikut dan pecah menjadi format JSON sesuai skema yang diminta. Buat bahasanya lugas, tidak bertele-tele.

ATURAN PALING KRUSIAL (GROUNDING):
1. Hasil rangkuman HANYA BOLEH berasal dari teks artikel berita yang dikirimkan.
2. DILARANG KERAS berasumsi, menduga-duga, atau menambahkan informasi/fakta fiktif dari luar artikel (NO HALLUCINATION). Jika informasi tidak ada di dalam artikel, jangan ditulis.`;

// Model resmi yang aktif saat ini sesuai anjuran Google API
const MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
];

async function tryGenerate(prompt: string, slideCount: string, wordCount: string, context: string) {
  let lastError: any = null;
  const currentSchema = getMediaSchema(slideCount, wordCount);

  let finalPrompt = `${SYSTEM_PROMPT}\n\n`;
  if (context && context.trim() !== '') {
    finalPrompt += `SUDUT PANDANG / KONTEKS TAMBAHAN DARI USER:\n"${context.trim()}"\n\n(Tulis rangkuman berita ini dengan menyesuaikan sudut pandang/konteks di atas tanpa melanggar aturan grounding).\n\n`;
  }
  finalPrompt += `Berikut adalah teks beritanya:\n"${prompt}"`;

  for (const modelName of MODELS) {
    try {
      console.log(`Trying model: ${modelName} with slideCount: ${slideCount}, wordCount: ${wordCount}...`);

      const result = await generateObject({
        model: google(modelName),
        schema: currentSchema,
        prompt: finalPrompt,
        temperature: 0.7,
      });

      console.log(`Success with model: ${modelName}`);
      return result.object;

    } catch (error: any) {
      console.warn(`Model ${modelName} failed:`, error?.message || 'Unknown error');
      lastError = error;

      // Jika error 401 (API key salah), langsung lempar tanpa coba yang lain
      const status = error?.status || error?.statusCode || error?.data?.error?.code;
      if (status === 401) {
        throw error;
      }

      // Tunggu sebentar sebelum coba model berikutnya
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Jika kedua model gagal, coba sekali lagi dengan model kedua (flash-lite)
  console.log('All models failed. Retrying with gemini-3.5-flash-lite after 2s delay...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const result = await generateObject({
      model: google('gemini-3.5-flash-lite'),
      schema: currentSchema,
      prompt: finalPrompt,
      temperature: 0.7,
    });
    return result.object;
  } catch (finalError) {
    throw lastError || finalError;
  }
}

export async function POST(req: Request) {
  try {
    const { prompt, slideCount = 'auto', wordCount = 'sedang', context = '' } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: 'API Key belum dikonfigurasi.' }, { status: 500 });
    }

    console.log('Starting AI generation with fallback models...');
    const result = await tryGenerate(prompt, slideCount, wordCount, context);
    console.log('AI Generation Complete!');

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('=== AI GENERATION ERROR ===');
    console.error('Error message:', error?.message);
    console.error('=== END ERROR ===');

    let userMessage = error?.message || 'Unknown error';

    // Berikan pesan yang ramah untuk user
    if (userMessage.includes('503') || userMessage.includes('high demand') || userMessage.includes('UNAVAILABLE')) {
      userMessage = 'Server AI Google sedang sibuk (overload). Silakan tunggu 30 detik lalu coba lagi.';
    } else if (userMessage.includes('401') || userMessage.includes('API key')) {
      userMessage = 'API Key tidak valid. Periksa kembali file .env.local Anda.';
    }

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}

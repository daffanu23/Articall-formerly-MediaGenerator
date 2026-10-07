import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

// Schema JSON yang kita harapkan dari AI
const MediaSchema = z.object({
  cover: z.string().describe("Judul berita clickbait (hook) yang sangat menarik, singkat (maksimal 7 kata), gunakan tag <br> untuk pindah baris agar layoutnya bagus. HURUF KAPITAL SEMUA."),
  contents: z.array(z.string()).describe("Array berisi ringkasan berita. Buatlah maksimal 4 halaman (elemen array). Tiap halaman berisi teks ringkasan berita maksimal 2 kalimat pendek agar nyaman dibaca di Instagram."),
  outro: z.string().describe("Kalimat penutup yang merangkum berita atau Call to Action (ajakan membaca) ke website.")
});

const SYSTEM_PROMPT = `Kamu adalah Editor Senior Media Sosial yang ahli merangkum berita panjang menjadi format Microblog / Carousel Instagram yang viral dan informatif. 
Tugasmu: Rangkum artikel berita berikut dan pecah menjadi format JSON sesuai skema yang diminta. Buat bahasanya lugas, tidak bertele-tele, dan kekinian.`;

// Model resmi yang aktif saat ini sesuai anjuran Google API
const MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
];

async function tryGenerate(prompt: string) {
  let lastError: any = null;

  for (const modelName of MODELS) {
    try {
      console.log(`Trying model: ${modelName}...`);

      const result = await generateObject({
        model: google(modelName),
        schema: MediaSchema,
        prompt: `${SYSTEM_PROMPT}\n\nBerikut adalah teks beritanya:\n"${prompt}"`,
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
      schema: MediaSchema,
      prompt: `${SYSTEM_PROMPT}\n\nBerikut adalah teks beritanya:\n"${prompt}"`,
      temperature: 0.7,
    });
    return result.object;
  } catch (finalError) {
    throw lastError || finalError;
  }
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: 'API Key belum dikonfigurasi.' }, { status: 500 });
    }

    console.log('Starting AI generation with fallback models...');
    const result = await tryGenerate(prompt);
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

import React, { useState, useRef, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { Download, Upload, Image as ImageIcon, Type, LayoutTemplate, Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify, Heading1, Heading2, MoveVertical, Blend, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import './generator.css'; // Importing the CSS

// --- Tiptap MenuBar ---
const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    return (
        <div className="ngg-editor-menubar">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
                title="Heading 1 (Sangat Besar)"
            >
                <Heading1 size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
                title="Heading 2 (Besar)"
            >
                <Heading2 size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().setParagraph().run()}
                className={editor.isActive('paragraph') ? 'is-active' : ''}
                title="Paragraf (Normal)"
            >
                P
            </button>
            <div className="divider"></div>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'is-active' : ''}
                title="Tebal"
            >
                <Bold size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'is-active' : ''}
                title="Miring"
            >
                <Italic size={16} />
            </button>
            <div className="divider"></div>
            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
                title="Rata Kiri"
            >
                <AlignLeft size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
                title="Rata Tengah"
            >
                <AlignCenter size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
                title="Rata Kanan"
            >
                <AlignRight size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
                title="Rata Kanan Kiri (Justify)"
            >
                <AlignJustify size={16} />
            </button>
            <div className="divider"></div>
            <input
                type="color"
                onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()}
                value={editor.getAttributes('textStyle').color || '#ffffff'}
                title="Warna Teks"
                className="color-picker"
            />
        </div>
    );
};

export default function NewsGraphicGenerator() {
    const defaultContentHtml = "<p>Ini adalah teks paragraf untuk isi berita. Anda bisa mengetik penjelasan panjang di sini.</p><p>Teks ini akan rata kiri dan berukuran konsisten di semua perangkat agar selalu mudah dibaca oleh audiens.</p>";

    const [pages, setPages] = useState<any[]>([
        {
            id: 'cover',
            title: 'Cover / Hook',
            image: null,
            bgType: 'image',
            bgColor: '#1e293b',
            overlayStrength: 85,
            showLogo: true,
            logoPosition: 'top-left',
            bgZoom: 100,
            bgPosX: 50,
            bgPosY: 50,
            textPosition: 'bottom',
            html: "<h1 style=\"text-align: center\">JUDUL BERITA<br>ANDA DI SINI</h1>"
        },
        {
            id: 'content-1',
            title: 'Isi Berita 1',
            image: null,
            bgType: 'image',
            bgColor: '#1e293b',
            overlayStrength: 85,
            showLogo: true,
            logoPosition: 'top-left',
            bgZoom: 100,
            bgPosX: 50,
            bgPosY: 50,
            textPosition: 'bottom',
            html: defaultContentHtml
        },
        {
            id: 'outro',
            title: 'Penutup (QR Code)',
            image: null,
            bgType: 'color',
            bgColor: '#5a0000',
            overlayStrength: 0,
            showLogo: true,
            logoPosition: 'top-left',
            bgZoom: 100,
            bgPosX: 50,
            bgPosY: 50,
            qrImage: null,
            qrSize: 320,
            textPosition: 'top',
            html: "<p>Tuliskan kesimpulan berita Anda di sini. Jangan lupa arahkan pembaca untuk memindai QR Code di bawah untuk membaca artikel selengkapnya di website UKPM Civitas.</p>"
        }
    ]);

    const [activePageId, setActivePageId] = useState('cover');
    const activePage = pages.find(p => p.id === activePageId) || pages[0];

    const [aiPrompt, setAiPrompt] = useState('');
    const [aiSlideCount, setAiSlideCount] = useState('auto');
    const [aiWordCount, setAiWordCount] = useState('sedang');
    const [aiContext, setAiContext] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    
    // Global state untuk logo kustom
    const [customLogo, setCustomLogo] = useState<string | null>(null);

    const updatePage = (key: string, value: any) => {
        setPages(prev => prev.map(p => p.id === activePageId ? { ...p, [key]: value } : p));
    };

    const addPage = () => {
        const newId = `content-${Date.now()}`;
        const contentPagesCount = pages.filter(p => p.id !== 'cover' && p.id !== 'outro').length;

        const newPage = {
            id: newId,
            title: `Isi Berita ${contentPagesCount + 1}`,
            image: null,
            bgType: 'image',
            bgColor: '#1e293b',
            overlayStrength: 85,
            showLogo: true,
            logoPosition: 'top-left',
            bgZoom: 100,
            bgPosX: 50,
            bgPosY: 50,
            textPosition: 'bottom',
            html: defaultContentHtml
        };

        setPages(prev => {
            const outroIndex = prev.findIndex(p => p.id === 'outro');
            if (outroIndex !== -1) {
                const newPages = [...prev];
                newPages.splice(outroIndex, 0, newPage);
                return newPages;
            }
            return [...prev, newPage];
        });
        setActivePageId(newId);
    };

    const removePage = (id: string) => {
        if (id === 'cover' || id === 'outro' || pages.length <= 1) return;
        const newPages = pages.filter(p => p.id !== id);
        setPages(newPages);
        if (activePageId === id) {
            setActivePageId(newPages[0].id);
        }
    };

    // --- AI Generation Logic ---
    const handleGenerateAi = async () => {
        if (!aiPrompt.trim()) return alert('Masukkan teks berita terlebih dahulu!');

        setIsGeneratingAi(true);
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt, slideCount: aiSlideCount, wordCount: aiWordCount, context: aiContext })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();

            // Map AI response to our pages structure
            const newPages = [];

            // 1. Cover
            newPages.push({
                ...pages[0],
                html: `<h1 style="text-align: center">${data.cover}</h1>`
            });

            // 2. Content pages
            data.contents.forEach((content: string, idx: number) => {
                newPages.push({
                    id: `content-${Date.now()}-${idx}`,
                    title: `Isi Berita ${idx + 1}`,
                    image: null,
                    bgType: 'image',
                    bgColor: '#1e293b',
                    overlayStrength: 85,
                    showLogo: true,
                    logoPosition: 'top-left',
                    bgZoom: 100,
                    bgPosX: 50,
                    bgPosY: 50,
                    textPosition: 'bottom',
                    html: `<p style="text-align: justify">${content}</p>`
                });
            });

            // 3. Outro
            newPages.push({
                ...pages.find(p => p.id === 'outro'),
                html: `<p style="text-align: justify">${data.outro}</p>`
            });

            setPages(newPages);
            setActivePageId('cover'); // Reset view to cover

        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message || 'Terjadi kesalahan saat memproses dengan AI.'}`);
        } finally {
            setIsGeneratingAi(false);
        }
    };


    const [isExporting, setIsExporting] = useState(false);
    const [scale, setScale] = useState(1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle,
            Color,
        ],
        content: activePage.html,
        onUpdate: ({ editor }: { editor: any }) => {
            updatePage('html', editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && editor.getHTML() !== activePage.html) {
            editor.commands.setContent(activePage.html);
        }
    }, [activePageId, editor]);

    useEffect(() => {
        const updateScale = () => {
            if (wrapperRef.current) {
                const wrapperWidth = wrapperRef.current.offsetWidth;
                let maxScaleByHeight = 1;
                if (window.innerWidth >= 768) {
                    const maxHeight = window.innerHeight * 0.55;
                    maxScaleByHeight = maxHeight / 1350;
                }
                const scaleByWidth = wrapperWidth / 1080;
                setScale(Math.min(scaleByWidth, maxScaleByHeight));
            }
        };
        updateScale();
        // small timeout to ensure DOM is ready
        setTimeout(updateScale, 100);
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    const currentImage = activePage.image;
    const currentHtml = activePage.html;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                updatePage('image', event.target?.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleQuickUpload = (e: React.ChangeEvent<HTMLInputElement>, pageId: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setPages(prev => prev.map(p => p.id === pageId ? { ...p, image: event.target?.result, bgType: 'image' } : p));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                updatePage('qrImage', event.target?.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGlobalLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setCustomLogo(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExport = async () => {
        if (!previewRef.current) return;
        setIsExporting(true);
        try {
            const dataUrl = await htmlToImage.toPng(previewRef.current, {
                quality: 1.0,
                pixelRatio: 1,
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left',
                    margin: '0'
                }
            });
            const link = document.createElement('a');
            link.download = `berita-grafis-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Gagal mengekspor gambar:", err);
            alert("Terjadi kesalahan saat mengekspor gambar.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportAll = async () => {
        if (!previewRef.current) return;
        setIsExporting(true);
        const originalActiveId = activePageId;

        try {
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                setActivePageId(page.id);

                await new Promise(resolve => setTimeout(resolve, 800));

                const dataUrl = await htmlToImage.toPng(previewRef.current, {
                    quality: 1.0,
                    pixelRatio: 1,
                    style: {
                        transform: 'scale(1)',
                        transformOrigin: 'top left',
                        margin: '0'
                    }
                });

                const link = document.createElement('a');
                link.download = `berita-grafis-${i + 1}-${page.id}.png`;
                link.href = dataUrl;
                link.click();

                await new Promise(resolve => setTimeout(resolve, 400));
            }
        } catch (err) {
            console.error("Gagal mengekspor semua gambar:", err);
            alert("Terjadi kesalahan saat mengekspor gambar.");
        } finally {
            setActivePageId(originalActiveId);
            setIsExporting(false);
        }
    };

    let textPaddingBottom = activePageId === 'outro' ? '450px' : '60px';
    const isLogoAtTop = (activePage.logoPosition || 'top-left').includes('top');
    const isLogoAtBottom = (activePage.logoPosition || 'top-left').includes('bottom');
    const isLogoAtRight = (activePage.logoPosition || 'top-left').includes('right');
    const isLogoCollision = (activePage.textPosition === 'top' && isLogoAtTop) || (activePage.textPosition === 'bottom' && isLogoAtBottom);

    return (
        <div className="max-w-7xl mx-auto py-8">
            {/* AI Input Section - New Addition! */}
            <div className="mb-8 p-6 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl shadow-2xl border border-indigo-700">
                <div className="flex items-center gap-3 mb-4 text-white">
                    <Sparkles className="text-yellow-400" />
                    <h2 className="text-2xl font-bold">AI Media Auto-Generator</h2>
                </div>
                
                {pages.length > 3 ? (
                    <div className="bg-green-500/20 border border-green-400 text-green-100 p-4 rounded-xl mb-4 text-sm flex items-start gap-3">
                        <Sparkles className="text-green-400 shrink-0 mt-0.5" size={20} />
                        <div>
                            <strong>Teks Berhasil Dibuat!</strong> Sekarang perhatikan bagian "Semua Halaman" di bawah. Klik tombol <strong className="text-white bg-indigo-500 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mx-1 text-xs"><Upload size={12}/>+</strong> pada setiap halaman untuk mengunggah gambar latar secara cepat.
                        </div>
                    </div>
                ) : (
                    <p className="text-indigo-200 mb-4 text-sm">Tempelkan teks artikel berita yang panjang, dan AI akan merangkum serta menyusunnya menjadi slide carousel Instagram secara otomatis.</p>
                )}

                <textarea
                    className="w-full h-32 p-4 rounded-xl bg-indigo-950/50 border border-indigo-500 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                    placeholder="Masukkan teks berita Anda di sini..."
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                />
                <div className="mt-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-auto">
                        <label className="block text-indigo-300 text-sm font-semibold mb-2">Target Jumlah Slide (Isi):</label>
                        <select 
                            value={aiSlideCount}
                            onChange={(e) => setAiSlideCount(e.target.value)}
                            className="w-full sm:w-auto bg-indigo-900 border border-indigo-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                            <option value="auto">Auto (Disesuaikan AI)</option>
                            <option value="2">2 Slide</option>
                            <option value="3">3 Slide</option>
                            <option value="4">4 Slide</option>
                            <option value="5">5 Slide</option>
                            <option value="6">6 Slide</option>
                        </select>
                    </div>

                    <div className="w-full sm:w-auto">
                        <label className="block text-indigo-300 text-sm font-semibold mb-2">Kepadatan Teks per Slide:</label>
                        <select 
                            value={aiWordCount}
                            onChange={(e) => setAiWordCount(e.target.value)}
                            className="w-full sm:w-auto bg-indigo-900 border border-indigo-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                            <option value="singkat">Singkat (20-30 kata)</option>
                            <option value="sedang">Sedang (40-50 kata)</option>
                            <option value="panjang">Panjang (60-80 kata)</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-indigo-300 text-sm font-semibold mb-2">Konteks / Sudut Pandang Tambahan (Opsional):</label>
                    <textarea
                        className="w-full h-16 p-3 rounded-xl bg-indigo-950/50 border border-indigo-500 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none text-sm"
                        placeholder="Contoh: Buat dengan gaya bahasa Gen-Z yang santai, atau fokuskan pada dampak ekonomi..."
                        value={aiContext}
                        onChange={e => setAiContext(e.target.value)}
                    />
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={handleGenerateAi}
                        disabled={isGeneratingAi}
                        className="w-full sm:w-auto flex justify-center items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white px-6 py-3 rounded-full font-bold transition-all shadow-lg disabled:opacity-50"
                    >
                        {isGeneratingAi ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                        {isGeneratingAi ? 'AI Sedang Bekerja...' : 'Generate Layout dengan AI'}
                    </button>
                </div>
            </div>

            <div className="ngg-container">
                <div className="ngg-preview-area">
                    <div
                        className="ngg-card ngg-preview-wrapper bg-white/5 backdrop-blur-xl border-white/10"
                        onClick={() => {
                            if (window.innerWidth < 768) window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    >
                        <h2 className="ngg-title text-white">Live Preview (Resolusi 1080x1350)</h2>
                        <div ref={wrapperRef} style={{ width: '100%' }}></div>

                        <div
                            className="ngg-preview-container"
                            style={{
                                width: `${1080 * scale}px`,
                                height: `${1350 * scale}px`,
                                margin: '0 auto'
                            }}
                        >
                            <div
                                ref={previewRef}
                                className={`ngg-preview-canvas pos-${activePage.textPosition}`}
                                style={{
                                    width: '1080px',
                                    height: '1350px',
                                    transform: `scale(${scale})`,
                                    transformOrigin: 'top left',
                                    backgroundColor: activePage.bgType === 'color' ? (activePage.bgColor || '#1e293b') : (currentImage ? 'transparent' : '#e2e8f0'),
                                    overflow: 'hidden'
                                }}
                            >
                                {activePage.bgType !== 'color' && currentImage && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundImage: `url(${currentImage})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: `${activePage.bgPosX ?? 50}% ${activePage.bgPosY ?? 50}%`,
                                        transform: `scale(${(activePage.bgZoom ?? 100) / 100})`,
                                        zIndex: 0
                                    }}></div>
                                )}

                                {!currentImage && activePage.bgType !== 'color' && <span className="ngg-placeholder-text">Belum ada gambar latar</span>}

                                <div
                                    className="ngg-overlay"
                                    style={{ opacity: (activePage.overlayStrength !== undefined ? activePage.overlayStrength : 85) / 100 }}
                                ></div>

                                {activePage.showLogo !== false && !isLogoCollision && customLogo && (
                                    <img
                                        src={customLogo}
                                        alt="Logo Kustom"
                                        style={{
                                            position: 'absolute',
                                            width: '135px',
                                            zIndex: 3,
                                            filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.7))',
                                            top: isLogoAtTop ? '60px' : 'auto',
                                            bottom: isLogoAtBottom ? '60px' : 'auto',
                                            left: !isLogoAtRight ? '60px' : 'auto',
                                            right: isLogoAtRight ? '60px' : 'auto',
                                        }}
                                    />
                                )}

                                {activePageId === 'outro' && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '80px',
                                        left: '80px',
                                        right: '80px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        zIndex: 4
                                    }}>
                                        <h2 style={{
                                            color: 'white',
                                            fontSize: '40px',
                                            fontWeight: '700',
                                            width: '450px',
                                            lineHeight: '1.2',
                                            fontFamily: '"Poppins", sans-serif',
                                            margin: 0
                                        }}>Baca selengkapnya<br />di website kami!!</h2>

                                        {activePage.qrImage ? (
                                            <img
                                                src={activePage.qrImage}
                                                alt="QR Code"
                                                style={{
                                                    width: `${activePage.qrSize || 320}px`,
                                                    height: `${activePage.qrSize || 320}px`,
                                                    borderRadius: '24px',
                                                    objectFit: 'cover',
                                                    border: '8px solid white',
                                                    backgroundColor: 'white',
                                                    flexShrink: 0
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: `${activePage.qrSize || 320}px`,
                                                height: `${activePage.qrSize || 320}px`,
                                                backgroundColor: '#f1f5f9',
                                                borderRadius: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#64748b',
                                                fontSize: '18px',
                                                fontWeight: '600',
                                                border: '8px solid white',
                                                textAlign: 'center',
                                                padding: '20px',
                                                flexShrink: 0
                                            }}>
                                                Upload QR Code
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div
                                    className="ngg-text-container"
                                    style={{
                                        paddingTop: '60px',
                                        paddingBottom: textPaddingBottom,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        width: '100%',
                                        position: 'relative',
                                        zIndex: 2
                                    }}
                                >
                                    {activePage.showLogo !== false && isLogoCollision && customLogo && (
                                        <img
                                            src={customLogo}
                                            alt="Logo Kustom"
                                            style={{
                                                width: '135px',
                                                filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.7))',
                                                marginBottom: '40px',
                                                alignSelf: isLogoAtRight ? 'flex-end' : 'flex-start'
                                            }}
                                        />
                                    )}

                                    <div
                                        className="tiptap-output"
                                        dangerouslySetInnerHTML={{ __html: currentHtml }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ngg-card ngg-drone-view mt-6 bg-white/5 border-white/10">
                        <h3 className="ngg-drone-title text-white">Semua Halaman</h3>
                        <div className="ngg-drone-grid">
                            {pages.map((page, index) => {
                                const isSelected = page.id === activePageId;
                                return (
                                    <div
                                        key={page.id}
                                        className={`ngg-drone-item ${isSelected ? 'active' : ''}`}
                                        onClick={() => setActivePageId(page.id)}
                                        title={page.title}
                                    >
                                        <div className="ngg-drone-thumbnail">
                                            {page.bgType === 'image' && page.image ? (
                                                <div style={{
                                                    width: '100%', height: '100%',
                                                    backgroundImage: `url(${page.image})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: `${page.bgPosX ?? 50}% ${page.bgPosY ?? 50}%`,
                                                }}></div>
                                            ) : (
                                                <div style={{
                                                    width: '100%', height: '100%',
                                                    backgroundColor: page.bgColor || '#1e293b'
                                                }}></div>
                                            )}
                                            <div className="ngg-drone-item-overlay"></div>
                                            <div className="ngg-drone-number">{index + 1}</div>
                                            {isSelected && <div className="ngg-drone-active-ring"></div>}
                                            
                                            {/* Quick Upload Button directly on thumbnail */}
                                            {page.bgType === 'image' && !page.image && (
                                                <>
                                                    <label 
                                                        htmlFor={`quick-upload-${page.id}`} 
                                                        className="ngg-drone-quick-upload"
                                                        onClick={(e) => e.stopPropagation()}
                                                        title="Upload Gambar Cepat"
                                                    >
                                                        <Plus size={20} />
                                                    </label>
                                                    <input 
                                                        type="file" 
                                                        id={`quick-upload-${page.id}`} 
                                                        style={{ display: 'none' }} 
                                                        accept="image/*"
                                                        onChange={(e) => handleQuickUpload(e, page.id)} 
                                                    />
                                                </>
                                            )}
                                        </div>
                                        <div className="ngg-drone-label text-gray-300">{page.title}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="ngg-sidebar">
                    <div className="ngg-card bg-white/5 border-white/10 backdrop-blur-xl text-white">
                        <h2 className="ngg-title text-white">Pengaturan Grafis</h2>

                        <div className="ngg-form-group">
                            <label className="text-gray-300"><ImageIcon size={16} /> Logo Header (Opsional)</label>
                            <div className="ngg-upload-area">
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="global-logo-upload"
                                    onChange={handleGlobalLogoUpload}
                                />
                                <label htmlFor="global-logo-upload" className="ngg-upload-btn bg-gray-800 border-gray-600 hover:bg-gray-700" style={{ marginBottom: customLogo ? '8px' : '0' }}>
                                    <Upload size={18} /> {customLogo ? "Ganti Logo" : "Upload Logo Header"}
                                </label>
                                {customLogo && (
                                    <button 
                                        onClick={() => setCustomLogo(null)} 
                                        className="text-red-400 text-sm hover:text-red-300 w-full text-center mt-2 flex items-center justify-center gap-1"
                                    >
                                        <Trash2 size={14} /> Hapus Logo
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="ngg-form-group">
                            <label className="text-gray-300"><LayoutTemplate size={16} /> Pilih Halaman</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    value={activePageId}
                                    onChange={(e) => setActivePageId(e.target.value)}
                                    className="ngg-select bg-gray-800 text-white border-gray-600"
                                    style={{ flex: 1 }}
                                >
                                    {pages.map(p => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={addPage}
                                    className="ngg-export-btn"
                                    style={{ width: 'auto', padding: '12px', background: '#10b981' }}
                                    title="Tambah Halaman Baru"
                                >
                                    <Plus size={20} />
                                </button>
                                {!['cover', 'outro'].includes(activePageId) && (
                                    <button
                                        type="button"
                                        onClick={() => removePage(activePageId)}
                                        className="ngg-export-btn"
                                        style={{ width: 'auto', padding: '12px', background: '#ef4444' }}
                                        title="Hapus Halaman Ini"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="ngg-form-group">
                            <label className="text-gray-300"><MoveVertical size={16} /> Posisi Teks</label>
                            <div className="ngg-position-buttons border-gray-600">
                                <button
                                    className={`ngg-pos-btn bg-gray-800 text-gray-300 border-gray-600 ${activePage.textPosition === 'top' ? 'bg-indigo-600 text-white' : ''}`}
                                    onClick={() => updatePage('textPosition', 'top')}
                                >
                                    Atas
                                </button>
                                <button
                                    className={`ngg-pos-btn bg-gray-800 text-gray-300 border-gray-600 ${activePage.textPosition === 'center' ? 'bg-indigo-600 text-white' : ''}`}
                                    onClick={() => updatePage('textPosition', 'center')}
                                >
                                    Tengah
                                </button>
                                <button
                                    className={`ngg-pos-btn bg-gray-800 text-gray-300 border-gray-600 ${activePage.textPosition === 'bottom' ? 'bg-indigo-600 text-white' : ''}`}
                                    onClick={() => updatePage('textPosition', 'bottom')}
                                >
                                    Bawah
                                </button>
                            </div>
                        </div>

                        <div className="ngg-form-group">
                            <label className="text-gray-300"><LayoutTemplate size={16} /> Posisi Logo</label>
                            <div className="ngg-position-buttons border-gray-600" style={{ marginBottom: '8px' }}>
                                <button
                                    className={`ngg-pos-btn bg-gray-800 text-gray-300 border-gray-600 ${activePage.logoPosition === 'top-left' ? 'bg-indigo-600 text-white' : ''}`}
                                    onClick={() => updatePage('logoPosition', 'top-left')}
                                >Atas Kiri</button>
                                <button
                                    className={`ngg-pos-btn bg-gray-800 text-gray-300 border-gray-600 ${activePage.logoPosition === 'top-right' ? 'bg-indigo-600 text-white' : ''}`}
                                    onClick={() => updatePage('logoPosition', 'top-right')}
                                >Atas Kanan</button>
                            </div>
                            <div className="ngg-position-buttons border-gray-600">
                                <button
                                    className={`ngg-pos-btn bg-gray-800 text-gray-300 border-gray-600 ${activePage.logoPosition === 'bottom-left' ? 'bg-indigo-600 text-white' : ''}`}
                                    onClick={() => updatePage('logoPosition', 'bottom-left')}
                                >Bawah Kiri</button>
                                <button
                                    className={`ngg-pos-btn bg-gray-800 text-gray-300 border-gray-600 ${activePage.logoPosition === 'bottom-right' ? 'bg-indigo-600 text-white' : ''}`}
                                    onClick={() => updatePage('logoPosition', 'bottom-right')}
                                >Bawah Kanan</button>
                            </div>
                        </div>

                        <div className="ngg-form-group">
                            <label className="text-gray-300"><ImageIcon size={16} /> Latar Belakang</label>
                            <div className="ngg-position-buttons border-gray-600" style={{ marginBottom: '12px' }}>
                                <button
                                    className={`ngg-pos-btn bg-gray-800 text-gray-300 border-gray-600 ${activePage.bgType !== 'color' ? 'bg-indigo-600 text-white' : ''}`}
                                    onClick={() => updatePage('bgType', 'image')}
                                >
                                    Gambar
                                </button>
                                <button
                                    className={`ngg-pos-btn bg-gray-800 text-gray-300 border-gray-600 ${activePage.bgType === 'color' ? 'bg-indigo-600 text-white' : ''}`}
                                    onClick={() => updatePage('bgType', 'color')}
                                >
                                    Warna Solid
                                </button>
                            </div>

                            {activePage.bgType !== 'color' ? (
                                <div key="bg-image-mode" className="ngg-upload-area">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        id="image-upload"
                                        onChange={handleImageUpload}
                                    />
                                    <label htmlFor="image-upload" className="ngg-upload-btn bg-gray-800 border-gray-600 hover:bg-gray-700">
                                        <Upload size={18} /> {currentImage ? "Ganti Gambar" : "Pilih Gambar"}
                                    </label>

                                    {currentImage && (
                                        <div className="ngg-image-controls bg-gray-900 border-gray-700" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#ccc', marginBottom: '4px' }}>Sesuaikan Gambar</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#888', width: '50px' }}>Zoom</span>
                                                <input type="range" min="100" max="300" value={activePage.bgZoom ?? 100} onChange={(e) => updatePage('bgZoom', parseInt(e.target.value))} style={{ flex: 1, cursor: 'pointer' }} />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#888', width: '50px' }}>Horiz</span>
                                                <input type="range" min="0" max="100" value={activePage.bgPosX ?? 50} onChange={(e) => updatePage('bgPosX', parseInt(e.target.value))} style={{ flex: 1, cursor: 'pointer' }} />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#888', width: '50px' }}>Vertikal</span>
                                                <input type="range" min="0" max="100" value={activePage.bgPosY ?? 50} onChange={(e) => updatePage('bgPosY', parseInt(e.target.value))} style={{ flex: 1, cursor: 'pointer' }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div key="bg-color-mode" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <input
                                        type="color"
                                        value={activePage.bgColor || '#1e293b'}
                                        onChange={(e) => updatePage('bgColor', e.target.value)}
                                        style={{
                                            width: '45px',
                                            height: '45px',
                                            cursor: 'pointer',
                                            padding: '0',
                                            border: '1px solid #4b5563',
                                            borderRadius: '8px',
                                            background: '#1f2937'
                                        }}
                                    />
                                    <span style={{ color: '#ccc', fontSize: '0.9rem', fontWeight: '500' }}>Pilih warna latar</span>
                                </div>
                            )}
                        </div>

                        <div className="ngg-form-group">
                            <label className="text-gray-300"><Type size={16} /> Desain Teks</label>
                            <div className="ngg-editor-wrapper bg-gray-800 border-gray-600">
                                <MenuBar editor={editor} />
                                <EditorContent editor={editor} className="ngg-editor-content bg-gray-900" />
                            </div>
                        </div>

                        {activePageId === 'outro' && (
                            <div className="ngg-form-group">
                                <label className="text-gray-300"><ImageIcon size={16} /> QR Code (Opsional)</label>
                                <div className="ngg-upload-area">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        id="qr-upload"
                                        onChange={handleQrUpload}
                                    />
                                    <label htmlFor="qr-upload" className="ngg-upload-btn bg-gray-800 border-gray-600 hover:bg-gray-700" style={{ marginBottom: '16px' }}>
                                        <Upload size={18} /> {activePage.qrImage ? "Ganti QR Code" : "Upload QR Code"}
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            className="ngg-export-btn hover:bg-indigo-700"
                            onClick={handleExport}
                            disabled={isExporting}
                            style={{ flex: 1, backgroundColor: '#334155' }}
                        >
                            <Download size={18} />
                            Halaman Ini
                        </button>
                        <button
                            className="ngg-export-btn bg-indigo-600 hover:bg-indigo-500"
                            onClick={handleExportAll}
                            disabled={isExporting}
                            style={{ flex: 2 }}
                        >
                            <Download size={18} />
                            {isExporting ? "Memproses..." : "Download Semua"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

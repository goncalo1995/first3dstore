const galleryItems = [
  {
    title: 'Sala de Estar',
    alt: 'Living room setting',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Para transformar uma fotografia de família numa peça central acolhedora.',
    // detail: 'Funciona especialmente bem em aparadores, estantes e mesas laterais onde a luz ambiente já faz parte do ritual da casa.',
    className: 'md:col-span-2 md:row-span-2',
  },
  {
    title: 'Quarto de Bebé',
    alt: 'Nursery room setting',
    image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Uma luz suave para celebrar os primeiros meses, batizados ou retratos de recém-nascido.',
    // detail: 'O brilho âmbar fica discreto e íntimo, ideal para um presente emocional sem parecer demasiado decorativo.',
    className: 'md:col-span-2',
  },
  {
    title: 'Escritório',
    alt: 'Office setting',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Para ter uma memória pessoal no espaço de trabalho sem perder o aspeto profissional.',
    // detail: 'Combina bem com molduras mais sóbrias e bases escuras.',
    className: 'md:col-span-2',
  },
  {
    title: 'Quarto',
    alt: 'Bedroom setting',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Perfeito para fotografias de casal, viagens marcantes ou uma dedicatória privada.',
    // detail: 'A luz baixa cria uma presença tranquila, mais próxima de uma memória do que de um candeeiro comum.',
    className: 'md:col-span-2',
  },
  {
    title: 'Hall de Entrada',
    alt: 'Hallway setting',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Uma peça de boas-vindas para casas novas, ou recordações de família.',
    // detail: 'Boa opção para fotografias com silhuetas fortes ou arquitetura da casa.',
    className: 'md:col-span-2',
  },
  {
    title: 'Mapas Topográficos 3D',
    alt: '3D Topographic Map',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
    occasion: 'A próxima coleção para locais com significado: serra, praia, aldeia, trilho ou paisagem portuguesa.',
    detail: 'Brevemente. A coleção de abertura é Lithophane, focada em molduras luminosas e formatos de luz personalizados.',
    badge: 'Brevemente',
    className: 'md:col-span-4'
  },
]

export default function GalleryItems() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-12 max-w-3xl">
        <p className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-primary">Get inspired</p>
        <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-5xl">Ideias para oferecer, decorar e guardar memórias com intenção.</h2>
        <p className="mt-4 font-sans text-lg leading-8 text-black/62">
            Cada formato ganha vida de maneira diferente consoante o espaço e a ocasião. Use estas ideias como ponto de partida para escolher a fotografia certa.
        </p>
        </div>
        <div className="grid auto-rows-[369px] gap-5 md:grid-cols-3">
        {galleryItems.map((item) => (
            <article key={item.title} className={`group relative overflow-hidden rounded-lg border border-white/10 bg-white/8 ${item.className}`}>
            <div className="absolute inset-0 overflow-hidden">
                <img src={item.image} alt={item.alt} className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
            </div>
            <div className="absolute inset-0 bg-linear-to-t from-black/86 via-black/34 to-black/5" />
            {item.badge && (
                <span className="absolute right-4 top-4 rounded-full border border-[#ffaa00]/35 bg-primary/16 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#ffd38b] backdrop-blur-md">
                {item.badge}
                </span>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="font-serif text-2xl font-bold text-white">{item.title}</p>
                <p className="mt-2 max-w-xl font-sans text-sm leading-6 text-white/78">{item.occasion}</p>
                <p className="mt-3 hidden max-w-xl font-sans text-xs leading-5 text-white/56 md:block">{item.detail}</p>
            </div>
            </article>
        ))}
        </div>
    </div>
  )
}

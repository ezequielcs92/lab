import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Historia de la Liga',
  description: 'La historia del béisbol argentino desde sus inicios hasta hoy',
}

export default function HistoriaPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl md:text-5xl tracking-wider text-lab-white mb-2">
        NUESTRA <span className="text-gradient-gold">HISTORIA</span>
      </h1>
      <p className="font-condensed text-lab-gray tracking-wide text-lg mb-10">
        Más de 80 años construyendo el béisbol argentino
      </p>

      <div className="space-y-8">
        <HistorySection
          decade="1940s"
          title="Los Orígenes"
          content="Los primeros bates y guantes llegaron a la Argentina de la mano de inmigrantes japoneses y estadounidenses. En campos improvisados de Buenos Aires y alrededores, se formaron las primeras ligas amateurs que darían origen a lo que hoy conocemos como la Liga Argentina de Béisbol."
        />
        <HistorySection
          decade="1950s"
          title="La Institucionalización"
          content="La década del 50 marcó la formalización del deporte con la creación de instituciones deportivas dedicadas al béisbol. Los primeros clubes oficiales comenzaron a tomar forma, con reglamentos propios y torneos organizados."
        />
        <HistorySection
          decade="1960-70s"
          title="Expansión al Interior"
          content="El béisbol dejó de ser un fenómeno exclusivamente porteño. Córdoba, Rosario y otras ciudades del interior formaron sus propios clubes, enriqueciendo la competencia y ampliando la base de jugadores."
        />
        <HistorySection
          decade="1980-90s"
          title="Profesionalización"
          content="Con la llegada de entrenadores internacionales y la participación en torneos latinoamericanos, el béisbol argentino elevó su nivel competitivo. Se establecieron estándares de formación y se crearon las categorías juveniles."
        />
        <HistorySection
          decade="2000s"
          title="Era Moderna"
          content="La digitalización y la globalización trajeron nuevas oportunidades. Jugadores argentinos comenzaron a ser observados por scouts internacionales, y la Liga modernizó sus sistemas de registro y competencia."
        />
        <HistorySection
          decade="2020s"
          title="Transformación Digital"
          content="Con la creación de esta plataforma, la Liga Argentina de Béisbol da un paso decisivo hacia la era digital, centralizando datos, preservando la historia y conectando a toda la comunidad del béisbol argentino."
        />
      </div>
    </div>
  )
}

function HistorySection({ decade, title, content }: { decade: string; title: string; content: string }) {
  return (
    <div className="flex gap-6 group">
      <div className="flex-shrink-0 w-20">
        <span className="font-display text-2xl text-lab-gold">{decade}</span>
      </div>
      <div className="bg-lab-surface rounded-lg border border-lab-border p-6 flex-1 group-hover:border-lab-gold/30 transition-colors">
        <h2 className="font-display text-xl tracking-wider text-lab-white mb-2">{title}</h2>
        <p className="text-lab-gray leading-relaxed">{content}</p>
      </div>
    </div>
  )
}

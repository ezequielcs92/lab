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
        Más de un siglo de béisbol argentino
      </p>

      <div className="space-y-8">
        <HistorySection
          decade="1890s"
          title="Los Orígenes"
          content="El béisbol en Argentina tiene más de un siglo de desarrollo, con sus primeras prácticas registradas a fines del siglo XIX en ciudades como Buenos Aires y Rosario, impulsadas principalmente por comunidades extranjeras y el intercambio cultural en los puertos."
        />
        <HistorySection
          decade="1925"
          title="La Institucionalización"
          content="Se fundó la Asociación Argentina de Béisbol, que organizaría el primer torneo de béisbol del país. Para mediados de la década de 1930, instituciones tradicionales del fútbol argentino como Boca Juniors, River Plate, Gimnasia y Esgrima La Plata y San Lorenzo de Almagro comenzaron a disputar torneos en diversas categorías."
        />
        <HistorySection
          decade="1959"
          title="Campeones Sudamericanos"
          content="La Selección nacional alcanzó uno de sus primeros hitos al consagrarse campeona sudamericana junto a Brasil, en Santiago de Chile. Sin embargo, el desarrollo del béisbol en otros países de la región generó una competencia cada vez más exigente en el plano continental."
        />
        <HistorySection
          decade="1960–70s"
          title="Intercambio Internacional"
          content="El béisbol argentino fortaleció su vínculo internacional a través de la participación en competencias y la recepción de equipos extranjeros. Se destacan la visita del Den Den de Japón en 1965, Kanebo de Brasil en 1968, y Toshiba de Japón en 1978. En 1973 la Selección mayor participó de la primera Copa Intercontinental en Italia, y en 1977 Argentina fue sede del Primer Campeonato Mundial Juvenil."
        />
        <HistorySection
          decade="1980s"
          title="Consolidación Local"
          content="Clubes como Ferro Carril Oeste y DAOM se consolidaron como protagonistas del campeonato metropolitano, marcando una etapa de crecimiento y competitividad en el ámbito nacional."
        />
        <HistorySection
          decade="1995"
          title="Hito Panamericano"
          content="En los Juegos Panamericanos de Mar del Plata, la Selección argentina logró una actuación histórica al vencer a potencias como Estados Unidos y Puerto Rico, clasificando a la ronda final y alcanzando el quinto puesto — el mejor resultado obtenido hasta ese momento en una competencia de este nivel."
        />
        <HistorySection
          decade="2017"
          title="Nace la LAB"
          content="Se produjo un punto de inflexión con la creación de la Liga Argentina de Béisbol (LAB), fundada por Pablo Tesouro y Roberto Braccini con el objetivo de desarrollar una competencia nacional de carácter semiprofesional que elevara el nivel del béisbol argentino. En sus primeros años participaron equipos de Salta y Córdoba."
        />
        <HistorySection
          decade="2019"
          title="Proyección Internacional"
          content="Se alcanzó un hito significativo cuando, por primera vez, el campeón de la Liga representó a la Argentina en una competencia internacional de clubes, la Serie Latinoamericana."
        />
        <HistorySection
          decade="2023"
          title="Competencia Nacional"
          content="A partir de la sexta temporada se incorporaron los clubes de Buenos Aires, conformando una competencia nacional con la participación de equipos de las tres regiones donde el béisbol argentino tiene mayor desarrollo: Salta, Córdoba y Buenos Aires."
        />
        <HistorySection
          decade="2025"
          title="El Presente"
          content="La Liga integra seis equipos: Falcons y Arias de Córdoba, Infernales y Cachorros de Salta, y Patriots y DAOM de Buenos Aires. En la temporada 2025, el campeón Club DAOM representó a la Argentina en la Serie de las Américas 2026 disputada en Venezuela. Hoy la LAB es el principal escenario competitivo del béisbol nacional y una plataforma que conecta el talento local con el desarrollo internacional del deporte."
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

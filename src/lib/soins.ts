export interface Soin {
  name: string
  tagline: string
  cat: string
  price: number
  dur: string
  forWho: string
  lede: string
  extra: string
  stepCore: string
  stepCoreDur: string
  benefits: [string, string][]
  rating: number
  count: number
  bars: number[]       // [5★%, 4★%, 3★%, 2★%, 1★%]
  recommend: string
  retour: string
  reviews: Review[]
  related: SoinId[]
  bg?: string
}

export interface Review {
  n: string
  a: string
  v: boolean
  when: string
  star: number
  q: string
  tags: string[]
  tone?: "recent"
  reply?: string
}

export type SoinId = "corps" | "visage" | "sel" | "galet" | "mains" | "jambes"

export const SOINS: Record<SoinId, Soin> = {
  corps: {
    name: "Soin du corps", tagline: "Signature", cat: "Corps",
    price: 105, dur: "60 min", forWho: "Tensions, fatigue accumulée",
    lede: "Le rituel signature de la maison. Un massage complet aux huiles tièdes, en gestes lents et profonds — pour relâcher tout ce que le quotidien a laissé s'installer.",
    extra: "Pression modulée selon votre besoin, du frôlement doux au modelage profond. Je travaille d'abord les zones de tension habituelles (épaules, nuque, lombaires), puis je laisse le corps guider la suite. Aucun protocole rigide : chaque séance est ajustée en temps réel.",
    stepCore: "Modelage complet du corps aux huiles tièdes : dos, jambes, bras, ventre, visage si vous le souhaitez. Travail des points de tension, pressions glissées, étirements doux.",
    stepCoreDur: "~ 50 minutes",
    benefits: [
      ["Détente profonde", "Le système nerveux passe en mode parasympathique — le corps se met enfin au calme."],
      ["Sommeil amélioré", "Beaucoup de clientes décrivent un sommeil plus profond la nuit suivante."],
      ["Tensions relâchées", "Épaules, nuque, lombaires — les zones qui portent la journée se desserrent."],
      ["Circulation activée", "Le travail manuel relance la circulation lymphatique et sanguine."],
      ["Clarté mentale", "L'esprit ralentit — c'est souvent là que les bonnes idées arrivent."],
      ["Peau hydratée", "Huile biologique nourrissante, sans parfum de synthèse."],
    ],
    rating: 4.9, count: 47, bars: [89, 9, 2, 0, 0],
    recommend: "98 %", retour: "94 %",
    reviews: [
      { n: "Sophie Marchand", a: "S", v: true, when: "Il y a 2 jours", star: 5, q: "Un moment magique. Je me suis sentie légère et apaisée pendant des jours — Laurence a un don pour ajuster la pression au quart de tour. C'est devenu mon rituel mensuel.", tags: ["Apaisant", "Sur-mesure", "Ambiance"], tone: "recent", reply: "Merci Sophie, c'est toujours une joie. À très bientôt dans la bulle." },
      { n: "Marc Dubois", a: "M", v: true, when: "Il y a 5 jours", star: 5, q: "Première séance et déjà conquis. L'écoute en début de séance change vraiment tout — Laurence repère exactement où ça coince. À très vite.", tags: ["Première fois", "Écoute"], tone: "recent" },
      { n: "Camille Roy", a: "C", v: true, when: "Il y a 2 semaines", star: 5, q: "J'y retourne chaque mois et c'est devenu mon vrai sas de décompression. Aucune séance n'est jamais la même.", tags: ["Régulière", "Apaisant"], reply: "Camille, merci. C'est précieux quand on se retrouve aussi régulièrement." },
      { n: "Aïcha Bensaïd", a: "A", v: true, when: "Il y a 3 semaines", star: 5, q: "Le rapport qualité-attention est inégalable. Je suis allée dans beaucoup de spas — ici, c'est différent, c'est personnel.", tags: ["Personnalisé", "Huiles"] },
      { n: "Hélène Bertrand", a: "H", v: true, when: "Il y a 1 mois", star: 4, q: "Excellente praticienne. Une étoile en moins juste parce qu'il faisait un peu chaud dans la salle — mais le soin, rien à redire.", tags: ["Apaisant", "Température"] },
      { n: "Julien Marchal", a: "J", v: true, when: "Il y a 2 mois", star: 5, q: "Le meilleur cadeau qu'on m'ait offert cette année.", tags: ["Cadeau"] },
    ],
    related: ["galet", "sel", "visage"],
    bg: "#2C1F14",
  },

  visage: {
    name: "Soin visage", tagline: "Éclat", cat: "Visage",
    price: 45, dur: "30 min", forWho: "Teint terne, peau fatiguée",
    lede: "Trente minutes pour redonner souffle et lumière à votre peau — nettoyage doux, modelage facial et masque sur‑mesure selon votre type de peau.",
    extra: "Je commence par lire votre peau : sèche, mixte, sensible, déshydratée ? Le masque est composé en direct, à partir d'argiles, hydrolats et huiles essentielles que je sélectionne sur place. Aucun produit standardisé.",
    stepCore: "Nettoyage doux à l'eau florale, exfoliation enzymatique, massage facial drainant (Kobido inspiré), masque personnalisé posé 10 minutes, sérum nourrissant pour finir.",
    stepCoreDur: "~ 25 minutes",
    benefits: [
      ["Teint éclatant", "La micro‑circulation est relancée — le visage retrouve sa lumière naturelle."],
      ["Traits détendus", "Les tensions du front, des mâchoires et des yeux se desserrent."],
      ["Peau nourrie", "Hydrolats et huiles bio pour une peau souple et confortable."],
      ["Effet bonne mine", "Visible dès la fin de la séance, dure plusieurs jours."],
    ],
    rating: 4.8, count: 28, bars: [82, 14, 4, 0, 0],
    recommend: "96 %", retour: "89 %",
    reviews: [
      { n: "Inès Garnier", a: "I", v: true, when: "Il y a 1 semaine", star: 5, q: "J'ai la peau très réactive, et je ressors à chaque fois avec un teint reposé, sans rougeurs. Laurence prend vraiment le temps de comprendre ce dont ma peau a besoin.", tags: ["Peau sensible", "Éclat"], tone: "recent", reply: "Merci Inès — votre peau réagit très bien aux soins doux." },
      { n: "Laura Pinel", a: "L", v: true, when: "Il y a 2 semaines", star: 5, q: "Un vrai moment cocon. Le massage facial est divin, je suis ressortie comme neuve.", tags: ["Apaisant"] },
      { n: "Camille Roy", a: "C", v: true, when: "Il y a 3 semaines", star: 5, q: "Je le prends en complément du soin du corps quand j'en ai vraiment besoin. Effet bonne mine garanti pendant plusieurs jours.", tags: ["Complément", "Éclat"] },
      { n: "Sophie Marchand", a: "S", v: true, when: "Il y a 1 mois", star: 4, q: "Très bien, mais 30 minutes c'est court. La prochaine fois je tenterai le format long.", tags: ["Court"] },
    ],
    related: ["corps", "mains", "galet"],
    bg: "#3D2B1A",
  },

  sel: {
    name: "Soin sel de mer", tagline: "Tonique", cat: "Corps",
    price: 75, dur: "60 min", forWho: "Peau qui manque d'éclat, fatigue",
    lede: "Un soin tonique en deux temps : gommage minéral au sel marin pour réveiller la peau, puis modelage drainant aux huiles légères. On en ressort lumineuse, le souffle plus large.",
    extra: "Le sel utilisé vient des marais salants de Guérande. Mélangé à des huiles essentielles d'agrumes, il exfolie sans agresser et laisse une peau douce mais vivifiée. Idéal en début de printemps ou après un coup de fatigue.",
    stepCore: "Gommage corps entier au sel de Guérande, douche tiède, puis modelage drainant aux huiles d'amande douce et néroli.",
    stepCoreDur: "~ 50 minutes",
    benefits: [
      ["Peau lumineuse", "L'exfoliation révèle un grain de peau plus uniforme et lumineux."],
      ["Effet vivifiant", "Les agrumes dans le sel réveillent et oxygènent."],
      ["Drainage léger", "Les pressions remontantes activent la circulation."],
      ["Esprit léger", "Le côté tonique du soin laisse une énergie particulière."],
    ],
    rating: 4.8, count: 18, bars: [78, 17, 5, 0, 0],
    recommend: "94 %", retour: "88 %",
    reviews: [
      { n: "Laura Pinel", a: "L", v: true, when: "Il y a 1 semaine", star: 5, q: "Parfait après une grosse semaine. J'ai dormi 10h la nuit suivante.", tags: ["Tonique"], tone: "recent" },
      { n: "Aïcha Bensaïd", a: "A", v: true, when: "Il y a 2 semaines", star: 5, q: "Je l'avais pris pour me changer du soin du corps. C'est très différent, plus vif — j'ai adoré.", tags: ["Vif", "Drainage"], reply: "Merci Aïcha — c'est aussi mon soin préféré au printemps." },
      { n: "Camille Roy", a: "C", v: true, when: "Il y a 1 mois", star: 4, q: "Le gommage est parfait. Le modelage qui suit est peut‑être un poil moins long que ce que j'imaginais.", tags: ["Gommage"] },
    ],
    related: ["corps", "galet", "visage"],
    bg: "#4A3530",
  },

  galet: {
    name: "Soin galet chaud", tagline: "Énergétique", cat: "Pierres chaudes",
    price: 55, dur: "30 min", forWho: "Stress profond, blocages énergétiques",
    lede: "Des galets volcaniques tièdes posés sur les points d'énergie du dos, combinés à un modelage doux. Trente minutes qui agissent en profondeur, comme une longue expiration.",
    extra: "Les galets sont du basalte, conservant la chaleur très longtemps. Posés le long de la colonne, ils diffusent une chaleur enveloppante qui détend les muscles profonds et apaise le système nerveux. Très complémentaire d'un Soin du corps.",
    stepCore: "Pose des galets chauds le long de la colonne et sur les zones de tension, puis modelage doux au‑dessus avec d'autres galets glissés à l'huile.",
    stepCoreDur: "~ 25 minutes",
    benefits: [
      ["Chaleur enveloppante", "La chaleur profonde fait littéralement fondre les tensions."],
      ["Détente immédiate", "L'esprit décroche en quelques minutes."],
      ["Idéal en hiver", "Quand le corps a besoin d'être réchauffé en profondeur."],
      ["Action ciblée", "Les galets agissent là où on en a le plus besoin."],
    ],
    rating: 5.0, count: 16, bars: [100, 0, 0, 0, 0],
    recommend: "100 %", retour: "100 %",
    reviews: [
      { n: "Marc Dubois", a: "M", v: true, when: "Il y a 3 jours", star: 5, q: "Première fois avec des pierres chaudes — je ne pensais pas que ça pouvait faire autant de bien. Je suis sorti complètement détendu.", tags: ["Première fois", "Chaleur"], tone: "recent" },
      { n: "Sophie Marchand", a: "S", v: true, when: "Il y a 2 semaines", star: 5, q: "Le complément parfait au soin du corps. Je prends souvent les deux à la suite.", tags: ["Complément"] },
      { n: "Hélène Bertrand", a: "H", v: true, when: "Il y a 1 mois", star: 5, q: "Tellement réconfortant. La chaleur des pierres reste longtemps après la séance.", tags: ["Apaisant"] },
    ],
    related: ["corps", "sel", "mains"],
    bg: "#5C4033",
  },

  mains: {
    name: "Soin des mains", tagline: "Douceur", cat: "Mains & pieds",
    price: 35, dur: "30 min", forWho: "Mains fatiguées, sécheresse",
    lede: "Trente minutes pour redonner douceur, souplesse et beauté aux mains. Bain tiède, gommage doux, massage profond des paumes et hydratation nourrissante.",
    extra: "Souvent les premières à montrer la fatigue, les mains méritent qu'on s'y attarde. Ce soin combine technique manuelle et produits ultra‑doux pour un résultat visible dès la sortie.",
    stepCore: "Bain tiède aux huiles essentielles, gommage doux, massage des paumes et des poignets, hydratation profonde aux huiles précieuses.",
    stepCoreDur: "~ 25 minutes",
    benefits: [
      ["Mains soyeuses", "Le grain de peau est immédiatement transformé."],
      ["Poignets relâchés", "Pour celles et ceux qui travaillent à l'ordinateur."],
      ["Ongles renforcés", "L'huile pénètre et fortifie les cuticules."],
      ["Effet bien‑être", "Le massage des mains est étonnamment apaisant pour tout le corps."],
    ],
    rating: 4.7, count: 12, bars: [75, 17, 8, 0, 0],
    recommend: "92 %", retour: "83 %",
    reviews: [
      { n: "Inès Garnier", a: "I", v: true, when: "Aujourd'hui", star: 5, q: "Je travaille beaucoup sur écran et j'avais mal aux poignets. Une transformation en 30 minutes.", tags: ["Poignets", "Bureau"], tone: "recent" },
      { n: "Camille Roy", a: "C", v: true, when: "Il y a 3 semaines", star: 5, q: "Idéal en complément d'un soin du corps. Petit moment précieux.", tags: ["Complément"] },
      { n: "Julien Marchal", a: "J", v: true, when: "Il y a 1 mois", star: 4, q: "Très bien fait, j'aurais aimé un format un peu plus long.", tags: ["Court"] },
    ],
    related: ["corps", "visage", "galet"],
    bg: "#3A2A22",
  },

  jambes: {
    name: "Soin jambes légères", tagline: "Drainage", cat: "Jambes & pieds",
    price: 85, dur: "30 min", forWho: "Jambes lourdes, fatigue",
    lede: "Pressions remontantes, drainage doux et huiles fraîches : un soin ciblé pour soulager les jambes lourdes et retrouver une vraie sensation de légèreté.",
    extra: "Particulièrement adapté en été, en fin de grossesse (2e/3e trimestre) ou après de longues journées debout. Les techniques utilisées sont inspirées du drainage lymphatique manuel — précis, doux, jamais agressif.",
    stepCore: "Modelage des pieds, pressions glissées remontantes des chevilles jusqu'aux genoux puis hanches, drainage doux des points lymphatiques.",
    stepCoreDur: "~ 25 minutes",
    benefits: [
      ["Sensation de légèreté", "Effet drainage visible dès la sortie."],
      ["Circulation activée", "Le retour veineux se fait mieux."],
      ["Idéal en été", "Pour les jambes qui gonflent à la chaleur."],
      ["Adapté grossesse", "À partir du 2e trimestre, avec ajustement."],
    ],
    rating: 4.9, count: 21, bars: [86, 10, 4, 0, 0],
    recommend: "95 %", retour: "90 %",
    reviews: [
      { n: "Aïcha Bensaïd", a: "A", v: true, when: "Il y a 4 jours", star: 5, q: "Je viens chaque mois en été — c'est la seule chose qui marche vraiment sur mes jambes lourdes. Effet immédiat.", tags: ["Jambes lourdes", "Été"], tone: "recent" },
      { n: "Hélène Bertrand", a: "H", v: true, when: "Il y a 2 semaines", star: 5, q: "Drainage très professionnel, gestes précis. Je recommande à toutes les femmes enceintes.", tags: ["Grossesse", "Drainage"] },
      { n: "Laura Pinel", a: "L", v: true, when: "Il y a 1 mois", star: 4, q: "Très bien, sensation de légèreté immédiate. Petit bémol : je trouve le prix un peu élevé pour 30 minutes.", tags: ["Drainage", "Prix"] },
    ],
    related: ["corps", "sel", "galet"],
    bg: "#2E1E18",
  },
}

export const stars = (n: number) => "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n)

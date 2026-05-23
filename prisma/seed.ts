/**
 * La Bulle De Vie — Database seed
 *
 * Seeds 6 wellness services with full rich content + 5 artwork products.
 * Run with: npx prisma db seed
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ServiceCategory } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const services = [
  {
    slug: "corps",
    name: "Soin du corps",
    tagline: "Signature",
    forWho: "Tensions, fatigue accumulée",
    shortDescription: "Le rituel signature de la maison. Un massage complet aux huiles tièdes, en gestes lents et profonds — pour relâcher tout ce que le quotidien a laissé s'installer.",
    longDescription: "Pression modulée selon votre besoin, du frôlement doux au modelage profond. Je travaille d'abord les zones de tension habituelles (épaules, nuque, lombaires), puis je laisse le corps guider la suite. Aucun protocole rigide : chaque séance est ajustée en temps réel.",
    ritualCore: "Modelage complet du corps aux huiles tièdes : dos, jambes, bras, ventre, visage si vous le souhaitez. Travail des points de tension, pressions glissées, étirements doux.",
    ritualCoreDuration: "~ 50 minutes",
    benefits: [
      { title: "Détente profonde", description: "Le système nerveux passe en mode parasympathique — le corps se met enfin au calme." },
      { title: "Sommeil amélioré", description: "Beaucoup de clientes décrivent un sommeil plus profond la nuit suivante." },
      { title: "Tensions relâchées", description: "Épaules, nuque, lombaires — les zones qui portent la journée se desserrent." },
      { title: "Circulation activée", description: "Le travail manuel relance la circulation lymphatique et sanguine." },
      { title: "Clarté mentale", description: "L'esprit ralentit — c'est souvent là que les bonnes idées arrivent." },
      { title: "Peau hydratée", description: "Huile biologique nourrissante, sans parfum de synthèse." },
    ],
    relatedSlugs: ["galet", "sel", "visage"],
    bgColor: "#2C1F14",
    displayOrder: 1,
    description: "Le rituel signature de la maison. Un massage complet aux huiles tièdes, en gestes lents et profonds — pour relâcher tout ce que le quotidien a laissé s'installer. Pression modulée selon votre besoin, du frôlement doux au modelage profond.",
    durationMinutes: 60,
    price: 10500,
    category: ServiceCategory.massage,
    isPublished: true,
  },
  {
    slug: "visage",
    name: "Soin visage",
    tagline: "Éclat",
    forWho: "Teint terne, peau fatiguée",
    shortDescription: "Trente minutes pour redonner souffle et lumière à votre peau — nettoyage doux, modelage facial et masque sur‑mesure selon votre type de peau.",
    longDescription: "Je commence par lire votre peau : sèche, mixte, sensible, déshydratée ? Le masque est composé en direct, à partir d'argiles, hydrolats et huiles essentielles que je sélectionne sur place. Aucun produit standardisé.",
    ritualCore: "Nettoyage doux à l'eau florale, exfoliation enzymatique, massage facial drainant (Kobido inspiré), masque personnalisé posé 10 minutes, sérum nourrissant pour finir.",
    ritualCoreDuration: "~ 25 minutes",
    benefits: [
      { title: "Teint éclatant", description: "La micro‑circulation est relancée — le visage retrouve sa lumière naturelle." },
      { title: "Traits détendus", description: "Les tensions du front, des mâchoires et des yeux se desserrent." },
      { title: "Peau nourrie", description: "Hydrolats et huiles bio pour une peau souple et confortable." },
      { title: "Effet bonne mine", description: "Visible dès la fin de la séance, dure plusieurs jours." },
    ],
    relatedSlugs: ["corps", "mains", "galet"],
    bgColor: "#3D2B1A",
    displayOrder: 2,
    description: "Trente minutes pour redonner souffle et lumière à votre peau — nettoyage doux, modelage facial et masque sur-mesure selon votre type de peau. Le masque est composé en direct, à partir d'argiles, hydrolats et huiles essentielles.",
    durationMinutes: 30,
    price: 4500,
    category: ServiceCategory.massage,
    isPublished: true,
  },
  {
    slug: "sel",
    name: "Soin sel de mer",
    tagline: "Tonique",
    forWho: "Peau qui manque d'éclat, fatigue",
    shortDescription: "Un soin tonique en deux temps : gommage minéral au sel marin pour réveiller la peau, puis modelage drainant aux huiles légères. On en ressort lumineuse, le souffle plus large.",
    longDescription: "Le sel utilisé vient des marais salants de Guérande. Mélangé à des huiles essentielles d'agrumes, il exfolie sans agresser et laisse une peau douce mais vivifiée. Idéal en début de printemps ou après un coup de fatigue.",
    ritualCore: "Gommage corps entier au sel de Guérande, douche tiède, puis modelage drainant aux huiles d'amande douce et néroli.",
    ritualCoreDuration: "~ 50 minutes",
    benefits: [
      { title: "Peau lumineuse", description: "L'exfoliation révèle un grain de peau plus uniforme et lumineux." },
      { title: "Effet vivifiant", description: "Les agrumes dans le sel réveillent et oxygènent." },
      { title: "Drainage léger", description: "Les pressions remontantes activent la circulation." },
      { title: "Esprit léger", description: "Le côté tonique du soin laisse une énergie particulière." },
    ],
    relatedSlugs: ["corps", "galet", "visage"],
    bgColor: "#4A3530",
    displayOrder: 3,
    description: "Un soin tonique en deux temps : gommage minéral au sel marin pour réveiller la peau, puis modelage drainant aux huiles légères. Le sel vient des marais salants de Guérande, mélangé à des huiles essentielles d'agrumes.",
    durationMinutes: 60,
    price: 7500,
    category: ServiceCategory.massage,
    isPublished: true,
  },
  {
    slug: "galet",
    name: "Soin galet chaud",
    tagline: "Énergétique",
    forWho: "Stress profond, blocages énergétiques",
    shortDescription: "Des galets volcaniques tièdes posés sur les points d'énergie du dos, combinés à un modelage doux. Trente minutes qui agissent en profondeur, comme une longue expiration.",
    longDescription: "Les galets sont du basalte, conservant la chaleur très longtemps. Posés le long de la colonne, ils diffusent une chaleur enveloppante qui détend les muscles profonds et apaise le système nerveux. Très complémentaire d'un Soin du corps.",
    ritualCore: "Pose des galets chauds le long de la colonne et sur les zones de tension, puis modelage doux au‑dessus avec d'autres galets glissés à l'huile.",
    ritualCoreDuration: "~ 25 minutes",
    benefits: [
      { title: "Chaleur enveloppante", description: "La chaleur profonde fait littéralement fondre les tensions." },
      { title: "Détente immédiate", description: "L'esprit décroche en quelques minutes." },
      { title: "Idéal en hiver", description: "Quand le corps a besoin d'être réchauffé en profondeur." },
      { title: "Action ciblée", description: "Les galets agissent là où on en a le plus besoin." },
    ],
    relatedSlugs: ["corps", "sel", "mains"],
    bgColor: "#5C4033",
    displayOrder: 4,
    description: "Des galets volcaniques tièdes posés sur les points d'énergie du dos, combinés à un modelage doux. Les galets sont du basalte, conservant la chaleur très longtemps. Très complémentaire d'un Soin du corps.",
    durationMinutes: 30,
    price: 5500,
    category: ServiceCategory.energetique,
    isPublished: true,
  },
  {
    slug: "mains",
    name: "Soin des mains",
    tagline: "Douceur",
    forWho: "Mains fatiguées, sécheresse",
    shortDescription: "Trente minutes pour redonner douceur, souplesse et beauté aux mains. Bain tiède, gommage doux, massage profond des paumes et hydratation nourrissante.",
    longDescription: "Souvent les premières à montrer la fatigue, les mains méritent qu'on s'y attarde. Ce soin combine technique manuelle et produits ultra‑doux pour un résultat visible dès la sortie.",
    ritualCore: "Bain tiède aux huiles essentielles, gommage doux, massage des paumes et des poignets, hydratation profonde aux huiles précieuses.",
    ritualCoreDuration: "~ 25 minutes",
    benefits: [
      { title: "Mains soyeuses", description: "Le grain de peau est immédiatement transformé." },
      { title: "Poignets relâchés", description: "Pour celles et ceux qui travaillent à l'ordinateur." },
      { title: "Ongles renforcés", description: "L'huile pénètre et fortifie les cuticules." },
      { title: "Effet bien‑être", description: "Le massage des mains est étonnamment apaisant pour tout le corps." },
    ],
    relatedSlugs: ["corps", "visage", "galet"],
    bgColor: "#3A2A22",
    displayOrder: 5,
    description: "Trente minutes pour redonner douceur, souplesse et beauté aux mains. Bain tiède, gommage doux, massage profond des paumes et hydratation nourrissante. Ce soin combine technique manuelle et produits ultra-doux.",
    durationMinutes: 30,
    price: 3500,
    category: ServiceCategory.massage,
    isPublished: true,
  },
  {
    slug: "jambes",
    name: "Soin jambes légères",
    tagline: "Drainage",
    forWho: "Jambes lourdes, fatigue",
    shortDescription: "Pressions remontantes, drainage doux et huiles fraîches : un soin ciblé pour soulager les jambes lourdes et retrouver une vraie sensation de légèreté.",
    longDescription: "Particulièrement adapté en été, en fin de grossesse (2e/3e trimestre) ou après de longues journées debout. Les techniques utilisées sont inspirées du drainage lymphatique manuel — précis, doux, jamais agressif.",
    ritualCore: "Modelage des pieds, pressions glissées remontantes des chevilles jusqu'aux genoux puis hanches, drainage doux des points lymphatiques.",
    ritualCoreDuration: "~ 25 minutes",
    benefits: [
      { title: "Sensation de légèreté", description: "Effet drainage visible dès la sortie." },
      { title: "Circulation activée", description: "Le retour veineux se fait mieux." },
      { title: "Idéal en été", description: "Pour les jambes qui gonflent à la chaleur." },
      { title: "Adapté grossesse", description: "À partir du 2e trimestre, avec ajustement." },
    ],
    relatedSlugs: ["corps", "sel", "galet"],
    bgColor: "#2E1E18",
    displayOrder: 6,
    description: "Pressions remontantes, drainage doux et huiles fraîches : un soin ciblé pour soulager les jambes lourdes. Les techniques utilisées sont inspirées du drainage lymphatique manuel — précis, doux, jamais agressif.",
    durationMinutes: 30,
    price: 8500,
    category: ServiceCategory.massage,
    isPublished: true,
  },
];

const products = [
  {
    name: "Lumière dorée",
    description: "Une composition abstraite aux tonalités chaleureuses — ors, ambrés et beiges qui évoquent la lumière de fin d'été. Format idéal pour une entrée ou un salon.",
    price: 18000,
    stock: 1,
    medium: "Acrylique sur toile",
    dimensions: "50 × 60 cm",
    isPublished: true,
  },
  {
    name: "Silence botanique",
    description: "Branches fines sur fond crème lavé — une pièce épurée qui apporte calme et légèreté à n'importe quel espace. Encadrée sous verre anti-reflet.",
    price: 12000,
    stock: 1,
    medium: "Aquarelle sur papier 300g",
    dimensions: "30 × 40 cm",
    isPublished: true,
  },
  {
    name: "Vague intérieure",
    description: "Un mouvement fluide, presque méditatif. Les bleus profonds se fondent dans les blancs nacrés pour rappeler le mouvement de l'eau et l'apaisement qu'il procure.",
    price: 25000,
    stock: 1,
    medium: "Acrylique et résine sur toile",
    dimensions: "60 × 80 cm",
    isPublished: true,
  },
  {
    name: "Racines chaudes",
    description: "Texture généreuse au couteau, tonalités terracotta et brun chaud. Une œuvre qui ancre l'espace et lui donne du caractère, en rappelant la terre et la nature.",
    price: 35000,
    stock: 1,
    medium: "Acrylique en relief sur toile épaisse",
    dimensions: "70 × 90 cm",
    isPublished: true,
  },
  {
    name: "Souffle du matin",
    description: "Lavis délicat aux encres naturelles, nuances de rose poudré et de mauve. Une petite pièce précieuse, parfaite en cadeau ou pour un espace intime.",
    price: 8000,
    stock: 3,
    medium: "Encre et aquarelle sur papier",
    dimensions: "15 × 20 cm",
    isPublished: true,
  },
];

async function main() {
  console.log("Seeding services...");
  for (const service of services) {
    const upserted = await prisma.service.upsert({
      where: { slug: service.slug },
      update: {
        name: service.name,
        tagline: service.tagline,
        forWho: service.forWho,
        shortDescription: service.shortDescription,
        longDescription: service.longDescription,
        ritualCore: service.ritualCore,
        ritualCoreDuration: service.ritualCoreDuration,
        benefits: service.benefits,
        relatedSlugs: service.relatedSlugs,
        bgColor: service.bgColor,
        displayOrder: service.displayOrder,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        category: service.category,
        isPublished: service.isPublished,
      },
      create: service,
    });
    console.log(`  ✓ ${upserted.name} (${upserted.slug})`);
  }

  console.log("\nSeeding products...");
  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: product });
      console.log(`  ✓ (updated) ${product.name}`);
    } else {
      await prisma.product.create({ data: product });
      console.log(`  ✓ (created) ${product.name}`);
    }
  }

  console.log("\nSeed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

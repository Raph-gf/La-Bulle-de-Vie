/**
 * La Bulle De Vie — Database seed
 *
 * Seeds the 6 wellness services (mirrored from src/lib/soins.ts)
 * and 5 artwork products for the Décoration e-commerce section.
 *
 * Run with:
 *   npx prisma db seed
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ServiceCategory } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Services — exact data from src/lib/soins.ts
// Prices in euro cents (source prices × 100)
// ---------------------------------------------------------------------------

const services = [
  {
    slug: "corps",
    name: "Soin du corps",
    description:
      "Le rituel signature de la maison. Un massage complet aux huiles tièdes, en gestes lents et profonds — pour relâcher tout ce que le quotidien a laissé s'installer. Pression modulée selon votre besoin, du frôlement doux au modelage profond.",
    durationMinutes: 60,
    price: 10500, // 105 €
    category: ServiceCategory.massage,
    isPublished: true,
  },
  {
    slug: "visage",
    name: "Soin visage",
    description:
      "Trente minutes pour redonner souffle et lumière à votre peau — nettoyage doux, modelage facial et masque sur-mesure selon votre type de peau. Le masque est composé en direct, à partir d'argiles, hydrolats et huiles essentielles.",
    durationMinutes: 30,
    price: 4500, // 45 €
    category: ServiceCategory.massage,
    isPublished: true,
  },
  {
    slug: "sel",
    name: "Soin sel de mer",
    description:
      "Un soin tonique en deux temps : gommage minéral au sel marin pour réveiller la peau, puis modelage drainant aux huiles légères. Le sel vient des marais salants de Guérande, mélangé à des huiles essentielles d'agrumes.",
    durationMinutes: 60,
    price: 7500, // 75 €
    category: ServiceCategory.massage,
    isPublished: true,
  },
  {
    slug: "galet",
    name: "Soin galet chaud",
    description:
      "Des galets volcaniques tièdes posés sur les points d'énergie du dos, combinés à un modelage doux. Les galets sont du basalte, conservant la chaleur très longtemps. Très complémentaire d'un Soin du corps.",
    durationMinutes: 30,
    price: 5500, // 55 €
    category: ServiceCategory.energetique,
    isPublished: true,
  },
  {
    slug: "mains",
    name: "Soin des mains",
    description:
      "Trente minutes pour redonner douceur, souplesse et beauté aux mains. Bain tiède, gommage doux, massage profond des paumes et hydratation nourrissante. Ce soin combine technique manuelle et produits ultra-doux.",
    durationMinutes: 30,
    price: 3500, // 35 €
    category: ServiceCategory.massage,
    isPublished: true,
  },
  {
    slug: "jambes",
    name: "Soin jambes légères",
    description:
      "Pressions remontantes, drainage doux et huiles fraîches : un soin ciblé pour soulager les jambes lourdes. Les techniques utilisées sont inspirées du drainage lymphatique manuel — précis, doux, jamais agressif.",
    durationMinutes: 30,
    price: 8500, // 85 €
    category: ServiceCategory.massage,
    isPublished: true,
  },
];

// ---------------------------------------------------------------------------
// Products — 5 artwork items for the Décoration catalog
// Prices in euro cents
// ---------------------------------------------------------------------------

const products = [
  {
    name: "Lumière dorée",
    description:
      "Une composition abstraite aux tonalités chaleureuses — ors, ambrés et beiges qui évoquent la lumière de fin d'été. Format idéal pour une entrée ou un salon.",
    price: 18000, // 180 €
    stock: 1,
    medium: "Acrylique sur toile",
    dimensions: "50 × 60 cm",
    isPublished: true,
  },
  {
    name: "Silence botanique",
    description:
      "Branches fines sur fond crème lavé — une pièce épurée qui apporte calme et légèreté à n'importe quel espace. Encadrée sous verre anti-reflet.",
    price: 12000, // 120 €
    stock: 1,
    medium: "Aquarelle sur papier 300g",
    dimensions: "30 × 40 cm",
    isPublished: true,
  },
  {
    name: "Vague intérieure",
    description:
      "Un mouvement fluide, presque méditatif. Les bleus profonds se fondent dans les blancs nacrés pour rappeler le mouvement de l'eau et l'apaisement qu'il procure.",
    price: 25000, // 250 €
    stock: 1,
    medium: "Acrylique et résine sur toile",
    dimensions: "60 × 80 cm",
    isPublished: true,
  },
  {
    name: "Racines chaudes",
    description:
      "Texture généreuse au couteau, tonalités terracotta et brun chaud. Une œuvre qui ancre l'espace et lui donne du caractère, en rappelant la terre et la nature.",
    price: 35000, // 350 €
    stock: 1,
    medium: "Acrylique en relief sur toile épaisse",
    dimensions: "70 × 90 cm",
    isPublished: true,
  },
  {
    name: "Souffle du matin",
    description:
      "Lavis délicat aux encres naturelles, nuances de rose poudré et de mauve. Une petite pièce précieuse, parfaite en cadeau ou pour un espace intime.",
    price: 8000, // 80 €
    stock: 3,
    medium: "Encre et aquarelle sur papier",
    dimensions: "15 × 20 cm",
    isPublished: true,
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding services...");

  for (const service of services) {
    const upserted = await prisma.service.upsert({
      where: { slug: service.slug },
      update: {
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        category: service.category,
        isPublished: service.isPublished,
      },
      create: service,
    });
    console.log(`  ✓ Service: ${upserted.name} (${upserted.slug})`);
  }

  console.log("\nSeeding products...");

  for (const product of products) {
    // Products have no natural unique key other than name — use name for upsert
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });

    if (existing) {
      const updated = await prisma.product.update({
        where: { id: existing.id },
        data: product,
      });
      console.log(`  ✓ Product (updated): ${updated.name}`);
    } else {
      const created = await prisma.product.create({ data: product });
      console.log(`  ✓ Product (created): ${created.name}`);
    }
  }

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

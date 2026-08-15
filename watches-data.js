// ============================================================
// watches-data.js
// Basé sur watches.json — enrichi ici pour l'affichage (image de
// substitution dessinée en SVG + date d'ajout pour le tri).
// Remplacez `cover_image` par vos propres photographies HD.
// ============================================================

function watchGlyph(tone, sub){
  // Illustration vectorielle minimale d'un cadran, en niveaux de la teinte de la maison.
  // Sert de substitut élégant tant qu'aucune photo personnelle n'est ajoutée.
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <defs>
      <radialGradient id="g" cx="50%" cy="42%" r="75%">
        <stop offset="0%" stop-color="${sub}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${tone}" stop-opacity="0.05"/>
      </radialGradient>
    </defs>
    <rect width="400" height="400" fill="${tone}" fill-opacity="0.06"/>
    <rect width="400" height="400" fill="url(#g)"/>
    <circle cx="200" cy="200" r="128" fill="none" stroke="${tone}" stroke-opacity="0.55" stroke-width="1.5"/>
    <circle cx="200" cy="200" r="112" fill="none" stroke="${tone}" stroke-opacity="0.3" stroke-width="1"/>
    ${Array.from({length:12}).map((_,i)=>{
      const a = (i/12)*Math.PI*2 - Math.PI/2;
      const r1= i%3===0? 96:104, r2=112;
      const x1=200+r1*Math.cos(a), y1=200+r1*Math.sin(a);
      const x2=200+r2*Math.cos(a), y2=200+r2*Math.sin(a);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${tone}" stroke-opacity="0.5" stroke-width="${i%3===0?2:1}"/>`;
    }).join('')}
    <line x1="200" y1="200" x2="200" y2="110" stroke="${tone}" stroke-width="3" stroke-linecap="round"/>
    <line x1="200" y1="200" x2="255" y2="200" stroke="${tone}" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="200" cy="200" r="5" fill="${tone}"/>
    <circle cx="200" cy="140" r="2" fill="${tone}" fill-opacity="0.6"/>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

const WATCHES = [
  {
    id: "tudor-bb58-navy",
    brand: "Tudor",
    model: "Black Bay 58",
    reference: "M79030B-0001",
    price_estimate: "3 800 €",
    status: "Possédée",
    production_status: "En production",
    production_years: "2020 - Présent",
    added_date: "2024-03-12",
    cover_image: watchGlyph("#5E7086", "#8FA6BD"),
    gallery_images: [],
    specs: {
      case_diameter: 39, case_thickness: 11.9, lug_to_lug: 47,
      case_material: "Acier inoxydable", water_resistance: "200 m",
      dial_color: "Bleu", crystal: "Saphir bombé", dial_hex: "#1B3A63", bracelet_material: "Acier", case_shape: "Rond"
    },
    movement: { caliber: "MT5402", type: "Automatique", power_reserve: 70, frequency: "28 800 alt/h" },
    personal_notes: "Achetée pour mes 30 ans. Mouvement manufacture certifié COSC, tenue de l'heure irréprochable. Le boîtier de 39 mm reste la meilleure proportion jamais produite par Tudor — je ne m'en lasse pas."
  },
  {
    id: "lange-1815-wg",
    brand: "A. Lange & Söhne",
    model: "1815",
    reference: "235.026",
    price_estimate: "≈ 24 500 €",
    status: "Wishlist",
    production_status: "En production",
    production_years: "2015 - Présent",
    added_date: "2025-01-04",
    cover_image: watchGlyph("#B08D57", "#E4CB9A"),
    gallery_images: [],
    specs: {
      case_diameter: 38.5, case_thickness: 8.8, lug_to_lug: 46,
      case_material: "Or gris 18 carats", water_resistance: "30 m",
      dial_color: "Argenté", crystal: "Saphir", dial_hex: "#C7C4BC", bracelet_material: "Cuir", case_shape: "Rond"
    },
    movement: { caliber: "L051.1", type: "Manuel", power_reserve: 55, frequency: "21 600 alt/h" },
    personal_notes: "La pièce ultime pour moi : mouvement décoré à la main, platine en maillechort, coq de balancier gravé. Un jour, à Glashütte directement si possible."
  },
  {
    id: "rolex-explorer-124270",
    brand: "Rolex",
    model: "Explorer",
    reference: "124270",
    price_estimate: "7 900 €",
    status: "Possédée",
    production_status: "En production",
    production_years: "2021 - Présent",
    added_date: "2023-09-30",
    cover_image: watchGlyph("#2E3A31", "#5C7A63"),
    gallery_images: [],
    specs: {
      case_diameter: 36, case_thickness: 12, lug_to_lug: 44,
      case_material: "Oystersteel", water_resistance: "100 m",
      dial_color: "Noir", crystal: "Saphir", dial_hex: "#111214", bracelet_material: "Acier", case_shape: "Rond"
    },
    movement: { caliber: "3230", type: "Automatique", power_reserve: 70, frequency: "28 800 alt/h" },
    personal_notes: "Le retour au 36 mm d'origine était la bonne décision. Portée quotidienne, aucune fioriture — l'esprit Hillary / Norgay sur l'Everest."
  },
  {
    id: "omega-speedmaster-moonwatch",
    brand: "Omega",
    model: "Speedmaster Professional Moonwatch",
    reference: "310.30.42.50.01.001",
    price_estimate: "6 800 €",
    status: "Vendue",
    production_status: "En production",
    production_years: "2021 - Présent",
    added_date: "2022-06-18",
    cover_image: watchGlyph("#8A8D91", "#D8D8D6"),
    gallery_images: [],
    specs: {
      case_diameter: 42, case_thickness: 13.2, lug_to_lug: 48,
      case_material: "Acier inoxydable", water_resistance: "50 m",
      dial_color: "Noir", crystal: "Hésalite", dial_hex: "#0E0E0E", bracelet_material: "Acier", case_shape: "Rond"
    },
    movement: { caliber: "3861", type: "Manuel", power_reserve: 50, frequency: "21 600 alt/h" },
    personal_notes: "Revendue pour financer la Lange en liste d'envie — un crève-cœur, mais la seule montre portée sur la Lune reste gravée dans ma mémoire de collectionneur."
  },
  {
    id: "cartier-tank-must-wsta0106",
    brand: "Cartier",
    model: "Tank Must",
    reference: "WSTA0106",
    price_estimate: "4 350 €",
    status: "Wishlist",
    production_status: "En production",
    production_years: "2023 - Présent",
    added_date: "2025-11-02",
    official_url: "https://www.cartier.com/fr-ca/montres/collections/tank/montre-tank-must-de-cartier-CRWSTA0106.html",
    cover_image: watchGlyph("#8A8D91", "#D8D8D6"),
    gallery_images: [],
    specs: {
      case_shape: "Rectangulaire",
      case_diameter: 33.7, case_width: 25.5, case_height: 33.7, case_thickness: 6.6, lug_to_lug: null,
      case_material: "Acier inoxydable", water_resistance: "30 m",
      dial_color: "Argenté", crystal: "Saphir", dial_hex: "#C7C4BC", bracelet_material: "Acier"
    },
    movement: { caliber: "Quartz High Autonomy", type: "Quartz", power_reserve: 0, frequency: "Quartz" },
    personal_notes: "Le boîtier rectangulaire signature de Cartier depuis 1917. Sur ma liste pour un usage plus habillé, en alternance avec les montres rondes de la collection."
  }
];

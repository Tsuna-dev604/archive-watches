// ============================================================
// app.js — logique de la galerie, des filtres et de la fiche détail
// ============================================================

// ---------- CONNEXION SUPABASE (catalogue partagé) ----------
// Remplacez ces deux valeurs par celles de votre projet Supabase
// (Settings → API dans le tableau de bord Supabase).
const SUPABASE_URL = "https://fcddtvnywcmkzrqyzynb.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_FFSA3AuxRhKh2fKyKS-lGQ_P5DV980L";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let COLLECTION = [];

async function loadCollectionFromSupabase(){
  const { data, error } = await supabaseClient
    .from("watches")
    .select("data")
    .order("added_at", { ascending: false });

  if(error){
    console.error("Erreur de chargement Supabase :", error);
    // Repli local si la connexion échoue, pour ne pas bloquer l'affichage
    COLLECTION = WATCHES.map(w => JSON.parse(JSON.stringify(w)));
    return;
  }

  if(!data || !data.length){
    // Table vide : on amorce la base avec les montres d'exemple
    COLLECTION = WATCHES.map(w => JSON.parse(JSON.stringify(w)));
    for(const w of COLLECTION){
      await supabaseClient.from("watches").upsert({ id: w.id, data: w });
    }
  } else {
    COLLECTION = data.map(row => row.data);
  }
}

async function saveWatchToSupabase(w){
  const { error } = await supabaseClient.from("watches").upsert({ id: w.id, data: w });
  if(error) alert("Erreur d'enregistrement en ligne : " + error.message);
}

async function deleteWatchFromSupabase(id){
  const { error } = await supabaseClient.from("watches").delete().eq("id", id);
  if(error) alert("Erreur de suppression en ligne : " + error.message);
}

function refreshAllFiltersAndRender(){
  syncPriceRange(); buildStatusFilters(); buildBrandFilters(); buildMovementFilters();
  buildMaterialFilters(); buildBraceletFilters(); buildShapeFilters(); buildDialSwatches();
  render();
}

function subscribeToRealtimeChanges(){
  supabaseClient
    .channel("watches-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "watches" }, async () => {
      await loadCollectionFromSupabase();
      refreshAllFiltersAndRender();
    })
    .subscribe();
}

function slugify(brand, model){
  const base = `${brand}-${model}`.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  let id = base, n = 1;
  while(COLLECTION.some(w => w.id === id)){ id = `${base}-${++n}`; }
  return id;
}

const state = {
  search: "",
  status: new Set(),
  brand: new Set(),
  movement: new Set(),
  material: new Set(),
  bracelet: new Set(),
  dial: new Set(),
  shape: new Set(),
  diamMin: 30,
  diamMax: 46,
  priceMin: 0,
  priceMax: 30000,
  sort: "added_desc"
};

const DIAL_HEX = { "Bleu":"#1B3A63", "Argenté":"#C7C4BC", "Noir":"#111214" };

function parsePrice(str){
  if(!str) return 0;
  const digits = String(str).replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function unique(arr){ return [...new Set(arr)]; }

function buildCheckbox(container, values, key, extra=""){
  container.innerHTML = "";
  unique(values).sort().forEach(v => {
    const id = `${key}-${v.replace(/\s+/g,'-')}`;
    const label = document.createElement("label");
    label.className = "chip flex items-center gap-2";
    label.style.color = "var(--ink)";
    label.innerHTML = `<input type="checkbox" id="${id}" class="rounded" ${extra}> <span>${v}</span>`;
    label.querySelector("input").addEventListener("change", (e) => {
      if(e.target.checked) state[key].add(v); else state[key].delete(v);
      render();
    });
    container.appendChild(label);
  });
}

function buildDialSwatches(){
  const container = document.getElementById("dialFilters");
  container.innerHTML = "";
  unique(COLLECTION.map(w=>w.specs.dial_color)).forEach(color => {
    const hex = DIAL_HEX[color] || "#999";
    const el = document.createElement("button");
    el.className = "swatch";
    el.style.background = hex;
    el.title = color;
    el.addEventListener("click", () => {
      if(state.dial.has(color)) state.dial.delete(color); else state.dial.add(color);
      buildDialSwatches();
      render();
    });
    if(state.dial.has(color)) el.classList.add("active");
    container.appendChild(el);
  });
}

function buildStatusFilters(){
  buildCheckbox(document.getElementById("statusFilters"), COLLECTION.map(w=>w.status), "status");
}
function buildBrandFilters(){
  buildCheckbox(document.getElementById("brandFilters"), COLLECTION.map(w=>w.brand), "brand");
}
function buildMovementFilters(){
  buildCheckbox(document.getElementById("movementFilters"), COLLECTION.map(w=>w.movement.type), "movement");
}
function buildMaterialFilters(){
  buildCheckbox(document.getElementById("materialFilters"), COLLECTION.map(w=>w.specs.case_material), "material");
}
function buildBraceletFilters(){
  buildCheckbox(document.getElementById("braceletFilters"), COLLECTION.map(w=>w.specs.bracelet_material || "Non renseigné"), "bracelet");
}
function buildShapeFilters(){
  buildCheckbox(document.getElementById("shapeFilters"), COLLECTION.map(w=>w.specs.case_shape || "Rond"), "shape");
}

function matches(w){
  const q = state.search.trim().toLowerCase();
  if(q){
    const hay = `${w.brand} ${w.model} ${w.reference}`.toLowerCase();
    if(!hay.includes(q)) return false;
  }
  if(state.status.size && !state.status.has(w.status)) return false;
  if(state.brand.size && !state.brand.has(w.brand)) return false;
  if(state.movement.size && !state.movement.has(w.movement.type)) return false;
  if(state.material.size && !state.material.has(w.specs.case_material)) return false;
  if(state.bracelet.size && !state.bracelet.has(w.specs.bracelet_material || "Non renseigné")) return false;
  if(state.shape.size && !state.shape.has(w.specs.case_shape || "Rond")) return false;
  if(state.dial.size && !state.dial.has(w.specs.dial_color)) return false;
  if(w.specs.case_diameter < state.diamMin || w.specs.case_diameter > state.diamMax) return false;
  const price = parsePrice(w.price_estimate);
  if(price < state.priceMin || price > state.priceMax) return false;
  return true;
}

function sortList(list){
  const l = [...list];
  switch(state.sort){
    case "brand_asc": return l.sort((a,b)=>a.brand.localeCompare(b.brand));
    case "diam_asc": return l.sort((a,b)=>a.specs.case_diameter-b.specs.case_diameter);
    case "diam_desc": return l.sort((a,b)=>b.specs.case_diameter-a.specs.case_diameter);
    case "price_asc": return l.sort((a,b)=>parsePrice(a.price_estimate)-parsePrice(b.price_estimate));
    case "price_desc": return l.sort((a,b)=>parsePrice(b.price_estimate)-parsePrice(a.price_estimate));
    default: return l.sort((a,b)=> new Date(b.added_date) - new Date(a.added_date));
  }
}

function statusPillColor(status){
  if(status==="Possédée") return "var(--gold)";
  if(status==="Wishlist") return "var(--steel)";
  return "var(--ink-dim)";
}

function card(w){
  const div = document.createElement("div");
  div.className = "watch-card fade-in cursor-pointer border hairline rounded-lg overflow-hidden";
  div.innerHTML = `
    <div class="cover aspect-square" style="background:var(--card)">
      <img src="${w.cover_image}" alt="${w.brand} ${w.model}" class="w-full h-full object-cover">
      <div class="loupe"></div>
      <span class="absolute top-3 left-3 mono text-[9px] uppercase tracking-widest px-2 py-1 rounded-full border" style="border-color:${statusPillColor(w.status)}; color:${statusPillColor(w.status)}; background:color-mix(in srgb, var(--bg) 60%, transparent)">${w.status}</span>
      <div class="card-actions absolute top-3 right-3 flex gap-1.5 opacity-0 transition-opacity">
        <button class="edit-btn p-1.5 rounded-full border" style="border-color:var(--line); background:color-mix(in srgb, var(--bg) 70%, transparent)" title="Modifier">
          <i data-lucide="pencil" class="w-3.5 h-3.5" style="color:var(--ink)"></i>
        </button>
        <button class="delete-btn p-1.5 rounded-full border" style="border-color:var(--line); background:color-mix(in srgb, var(--bg) 70%, transparent)" title="Supprimer">
          <i data-lucide="trash-2" class="w-3.5 h-3.5" style="color:#C25B4A"></i>
        </button>
      </div>
    </div>
    <div class="p-3 md:p-4">
      <p class="mono text-[10px] tracking-[0.18em] uppercase" style="color:var(--ink-dim)">${w.brand}</p>
      <p class="serif text-lg md:text-xl italic leading-tight mt-0.5" style="color:var(--ink)">${w.model}</p>
    </div>
  `;
  div.style.position = "relative";
  div.querySelector(".cover").style.position = "relative";
  div.addEventListener("mouseenter", ()=> div.querySelector(".card-actions").style.opacity = "1");
  div.addEventListener("mouseleave", ()=> div.querySelector(".card-actions").style.opacity = "0");
  div.addEventListener("click", () => openModal(w));
  div.querySelector(".edit-btn").addEventListener("click", (e)=>{ e.stopPropagation(); openForm(w); });
  div.querySelector(".delete-btn").addEventListener("click", (e)=>{ e.stopPropagation(); deleteWatch(w); });
  return div;
}

function render(){
  const gallery = document.getElementById("gallery");
  const empty = document.getElementById("emptyState");
  const filtered = sortList(COLLECTION.filter(matches));
  gallery.innerHTML = "";
  if(!filtered.length){
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    filtered.forEach(w => gallery.appendChild(card(w)));
  }
  document.getElementById("countLabel").textContent =
    `${filtered.length} pièce${filtered.length>1?"s":""} sur ${COLLECTION.length}`;
  document.getElementById("diamLabel").textContent = `${state.diamMin}–${state.diamMax} mm`;
  document.getElementById("priceLabel").textContent = `${state.priceMin.toLocaleString('fr-FR')}–${state.priceMax.toLocaleString('fr-FR')} €`;
  lucide.createIcons();
}

// ---------- MODAL ----------
function gaugeSVG(pct, label, value){
  const r = 30, c = 2*Math.PI*r;
  const offset = c * (1 - pct);
  return `
  <div class="flex flex-col items-center">
    <svg width="76" height="76" viewBox="0 0 76 76">
      <circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--line)" stroke-width="3"/>
      <circle class="gauge-ring" cx="38" cy="38" r="${r}" fill="none" stroke="var(--gold)" stroke-width="3"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}"
        transform="rotate(-90 38 38)"/>
    </svg>
    <p class="mono text-xs mt-1" style="color:var(--ink)">${value}</p>
    <p class="mono text-[9px] uppercase tracking-widest" style="color:var(--ink-dim)">${label}</p>
  </div>`;
}

function specRow(label, value){
  return `<div class="flex justify-between py-2 border-b hairline text-sm">
    <span class="mono text-[11px] uppercase tracking-wide" style="color:var(--ink-dim)">${label}</span>
    <span class="mono" style="color:var(--ink)">${value}</span>
  </div>`;
}

function openModal(w){
  const overlay = document.getElementById("modalOverlay");
  const content = document.getElementById("modalContent");
  const images = [w.cover_image, ...(w.gallery_images||[])].filter(Boolean);
  let slide = 0;

  content.innerHTML = `
    <div class="relative" style="background:var(--card)">
      <div class="aspect-[16/9] md:aspect-[21/9] relative overflow-hidden">
        <img id="carouselImg" src="${images[0]}" class="w-full h-full object-cover">
        <div class="absolute inset-0" style="background:linear-gradient(to top, var(--panel), transparent 50%)"></div>
        <div class="absolute bottom-4 left-6">
          <p class="mono text-[11px] uppercase tracking-[0.2em]" style="color:var(--ink-dim)">${w.brand}</p>
          <h2 class="serif text-3xl md:text-4xl italic" style="color:var(--ink)">${w.model}</h2>
        </div>
        ${images.length > 1 ? `
        <button id="carouselPrev" class="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full border" style="border-color:var(--line); background:color-mix(in srgb, var(--bg) 55%, transparent)">
          <i data-lucide="chevron-left" class="w-4 h-4" style="color:var(--ink)"></i>
        </button>
        <button id="carouselNext" class="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full border" style="border-color:var(--line); background:color-mix(in srgb, var(--bg) 55%, transparent)">
          <i data-lucide="chevron-right" class="w-4 h-4" style="color:var(--ink)"></i>
        </button>
        <span id="carouselCount" class="absolute bottom-4 right-6 mono text-[10px] tracking-widest px-2 py-1 rounded-full" style="color:var(--ink); background:color-mix(in srgb, var(--bg) 55%, transparent)">1 / ${images.length}</span>
        ` : ""}
      </div>
      ${images.length > 1 ? `
      <div id="carouselThumbs" class="flex gap-2 px-6 py-3 overflow-x-auto border-b hairline">
        ${images.map((src,i) => `<button class="thumb-btn shrink-0 w-14 h-14 rounded overflow-hidden border" data-i="${i}" style="border-color:${i===0?'var(--gold)':'var(--line)'}">
          <img src="${src}" class="w-full h-full object-cover">
        </button>`).join("")}
      </div>` : ""}
    </div>
    <div class="p-6 md:p-8 grid md:grid-cols-2 gap-8">
      <div>
        <div class="flex items-center gap-3 mb-6">
          <span class="mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border" style="border-color:${statusPillColor(w.status)}; color:${statusPillColor(w.status)}">${w.status}</span>
          <span class="mono text-[10px] uppercase tracking-widest" style="color:var(--ink-dim)">${w.production_status} · ${w.production_years}</span>
        </div>

        <p class="mono text-[10px] uppercase tracking-[0.2em] mb-2" style="color:var(--gold)">Boîtier</p>
        ${specRow("Référence", w.reference)}
        ${specRow("Forme", w.specs.case_shape || "Rond")}
        ${(w.specs.case_shape === "Carré" || w.specs.case_shape === "Rectangulaire")
          ? specRow("Dimensions", `${w.specs.case_width} × ${w.specs.case_height} mm`)
          : specRow("Diamètre", w.specs.case_diameter + " mm")}
        ${specRow("Épaisseur", w.specs.case_thickness + " mm")}
        ${specRow("Entrecorne", w.specs.lug_to_lug + " mm")}
        ${specRow("Matériau", w.specs.case_material)}
        ${specRow("Étanchéité", w.specs.water_resistance)}
        ${specRow("Cadran", w.specs.dial_color)}
        ${specRow("Verre", w.specs.crystal)}
        ${specRow("Bracelet", w.specs.bracelet_material || "Non renseigné")}

        <p class="mono text-[10px] uppercase tracking-[0.2em] mb-2 mt-6" style="color:var(--gold)">Style</p>
        ${specRow("Estimation", w.price_estimate)}
        ${w.official_url ? `
        <a href="${w.official_url}" target="_blank" rel="noopener noreferrer"
           class="inline-flex items-center gap-1.5 mono text-[11px] uppercase tracking-widest mt-3 hover:opacity-70" style="color:var(--gold)">
          Voir l'annonce officielle <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
        </a>` : ""}
      </div>

      <div>
        <p class="mono text-[10px] uppercase tracking-[0.2em] mb-4" style="color:var(--gold)">Mouvement</p>
        <div class="flex justify-between gap-4 mb-6">
          ${gaugeSVG(w.movement.power_reserve/80, "Réserve", w.movement.power_reserve+"h")}
          ${gaugeSVG(0.7, "Fréquence", w.movement.frequency.split(" ")[0])}
          ${gaugeSVG(w.movement.type==="Automatique"?1:0.5, "Remontage", w.movement.type)}
        </div>
        ${specRow("Calibre", w.movement.caliber)}
        ${specRow("Type", w.movement.type)}
        ${specRow("Réserve de marche", w.movement.power_reserve + " heures")}
        ${specRow("Fréquence", w.movement.frequency)}

        <p class="mono text-[10px] uppercase tracking-[0.2em] mb-2 mt-6" style="color:var(--gold)">Historique &amp; notes personnelles</p>
        <p class="text-sm leading-relaxed" style="color:var(--ink)">${w.personal_notes}</p>

        <div class="flex gap-3 mt-8 pt-6 border-t hairline">
          <button id="modalEditBtn" class="flex items-center gap-2 mono text-xs uppercase tracking-widest px-4 py-2 rounded-full border hairline hover:opacity-80" style="color:var(--ink)">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i> Modifier
          </button>
          <button id="modalDeleteBtn" class="flex items-center gap-2 mono text-xs uppercase tracking-widest px-4 py-2 rounded-full border hover:opacity-80" style="color:#C25B4A; border-color:#C25B4A">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Supprimer
          </button>
        </div>
      </div>
    </div>
  `;

  if(images.length > 1){
    const setSlide = (i) => {
      slide = (i + images.length) % images.length;
      document.getElementById("carouselImg").src = images[slide];
      document.getElementById("carouselCount").textContent = `${slide+1} / ${images.length}`;
      content.querySelectorAll(".thumb-btn").forEach(btn => {
        btn.style.borderColor = parseInt(btn.dataset.i) === slide ? "var(--gold)" : "var(--line)";
      });
    };
    activeCarouselNav = { next: ()=>setSlide(slide+1), prev: ()=>setSlide(slide-1) };
    document.getElementById("carouselPrev").addEventListener("click", ()=> setSlide(slide-1));
    document.getElementById("carouselNext").addEventListener("click", ()=> setSlide(slide+1));
    content.querySelectorAll(".thumb-btn").forEach(btn => {
      btn.addEventListener("click", ()=> setSlide(parseInt(btn.dataset.i)));
    });
  } else {
    activeCarouselNav = null;
  }
  overlay.classList.remove("hidden");
  overlay.classList.add("flex");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(()=>{
    content.querySelectorAll(".gauge-ring").forEach((ring,i)=>{
      const pcts = [w.movement.power_reserve/80, 0.7, w.movement.type==="Automatique"?1:0.5];
      const c = 2*Math.PI*30;
      ring.style.strokeDashoffset = c*(1-pcts[i]);
    });
  });
  document.getElementById("modalEditBtn").addEventListener("click", ()=>{ closeModal(); openForm(w); });
  document.getElementById("modalDeleteBtn").addEventListener("click", ()=>{ closeModal(); deleteWatch(w); });
  lucide.createIcons();
}

let activeCarouselNav = null;

function closeModal(){
  const overlay = document.getElementById("modalOverlay");
  overlay.classList.add("hidden");
  overlay.classList.remove("flex");
  document.body.style.overflow = "";
  activeCarouselNav = null;
}
document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("modalOverlay").addEventListener("click", (e)=>{
  if(e.target.id === "modalOverlay") closeModal();
});
document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape") closeModal();
  if(activeCarouselNav){
    if(e.key === "ArrowRight") activeCarouselNav.next();
    if(e.key === "ArrowLeft") activeCarouselNav.prev();
  }
});

// ---------- SUPPRESSION ----------
function deleteWatch(w){
  const ok = confirm(`Supprimer « ${w.brand} — ${w.model} » de la collection ?\nCette action est définitive et sera visible par tous (pensez à exporter en JSON si vous voulez garder une trace).`);
  if(!ok) return;
  COLLECTION = COLLECTION.filter(x => x.id !== w.id);
  deleteWatchFromSupabase(w.id);
  refreshAllFiltersAndRender();
}

// ---------- FORMULAIRE AJOUT / MODIFICATION ----------
function formField(label, id, value="", type="text", opts=null){
  if(opts){
    return `<label class="block mb-4">
      <span class="mono text-[10px] uppercase tracking-widest block mb-1.5" style="color:var(--ink-dim)">${label}</span>
      <select id="${id}" class="w-full bg-transparent border hairline rounded px-3 py-2 text-sm outline-none" style="color:var(--ink)">
        ${opts.map(o => `<option value="${o}" ${o===value?"selected":""}>${o}</option>`).join("")}
      </select>
    </label>`;
  }
  return `<label class="block mb-4">
    <span class="mono text-[10px] uppercase tracking-widest block mb-1.5" style="color:var(--ink-dim)">${label}</span>
    <input id="${id}" type="${type}" value="${value}" step="${type==='number'?'0.1':''}"
      class="w-full bg-transparent border hairline rounded px-3 py-2 text-sm outline-none" style="color:var(--ink)">
  </label>`;
}

function openForm(existing = null){
  const w = existing || {
    brand:"", model:"", reference:"", price_estimate:"", status:"Wishlist",
    production_status:"En production", production_years:"",
    specs:{ case_diameter:40, case_thickness:10, lug_to_lug:45, case_material:"Acier inoxydable", water_resistance:"100 m", dial_color:"Noir", crystal:"Saphir" },
    movement:{ caliber:"", type:"Automatique", power_reserve:48, frequency:"28 800 alt/h" },
    cover_image: watchGlyph("#B08D57", "#E4CB9A"),
    gallery_images: [],
    personal_notes:""
  };
  let coverDraft = w.cover_image;
  let galleryDraft = [...(w.gallery_images || [])];

  const overlay = document.getElementById("modalOverlay");
  const content = document.getElementById("modalContent");
  content.innerHTML = `
    <div class="p-6 md:p-8">
      <h2 class="serif text-2xl md:text-3xl italic mb-6" style="color:var(--ink)">${existing ? "Modifier la pièce" : "Ajouter une montre"}</h2>
      <form id="watchForm" class="grid md:grid-cols-2 gap-x-8">

        <div class="md:col-span-2 mb-2">
          <p class="mono text-[10px] uppercase tracking-[0.2em] mb-3" style="color:var(--gold)">Photos</p>
          <div class="grid sm:grid-cols-[140px_1fr] gap-6">
            <div>
              <p class="mono text-[9px] uppercase tracking-widest mb-2" style="color:var(--ink-dim)">Photo de présentation</p>
              <div class="relative w-[140px] h-[140px] rounded-lg overflow-hidden border hairline">
                <img id="coverPreview" src="${coverDraft}" class="w-full h-full object-cover">
                <label class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer" style="background:rgba(0,0,0,.45)">
                  <i data-lucide="camera" class="w-5 h-5 text-white"></i>
                  <input type="file" id="coverInput" accept="image/*" class="hidden">
                </label>
              </div>
            </div>
            <div class="min-w-0">
              <p class="mono text-[9px] uppercase tracking-widest mb-2" style="color:var(--ink-dim)">Galerie (carrousel dans la fiche détail)</p>
              <div id="galleryPreview" class="flex flex-wrap gap-2 mb-2"></div>
              <label class="inline-flex items-center gap-2 mono text-[10px] uppercase tracking-widest px-3 py-2 rounded-full border hairline cursor-pointer hover:opacity-80" style="color:var(--ink)">
                <i data-lucide="image-plus" class="w-3.5 h-3.5"></i> Ajouter des photos
                <input type="file" id="galleryInput" accept="image/*" multiple class="hidden">
              </label>
            </div>
          </div>
        </div>

        <div>
          <p class="mono text-[10px] uppercase tracking-[0.2em] mb-3" style="color:var(--gold)">Identification</p>
          ${formField("Marque", "f-brand", w.brand)}
          ${formField("Modèle", "f-model", w.model)}
          ${formField("Référence", "f-reference", w.reference)}
          ${formField("Estimation (prix)", "f-price", w.price_estimate)}
          ${formField("Statut", "f-status", w.status, "text", ["Possédée","Wishlist","Vendue"])}
          ${formField("Statut de production", "f-prodstatus", w.production_status, "text", ["En production","Discontinuée / Hors catalogue","Vintage"])}
          ${formField("Années de production", "f-years", w.production_years)}
          ${formField("Lien vers l'annonce officielle", "f-url", w.official_url || "", "url")}
          <p class="mono text-[10px] uppercase tracking-[0.2em] mb-3 mt-2" style="color:var(--gold)">Notes personnelles</p>
          <label class="block mb-4">
            <textarea id="f-notes" rows="4" class="w-full bg-transparent border hairline rounded px-3 py-2 text-sm outline-none" style="color:var(--ink)">${w.personal_notes}</textarea>
          </label>
        </div>
        <div>
          <p class="mono text-[10px] uppercase tracking-[0.2em] mb-3" style="color:var(--gold)">Boîtier</p>
          ${formField("Forme du boîtier", "f-shape", w.specs.case_shape || "Rond", "text", ["Rond","Carré","Rectangulaire","Coussin","Tonneau"])}
          <div id="diamGroup" class="grid grid-cols-2 gap-x-4">
            ${formField("Diamètre (mm)", "f-diam", w.specs.case_diameter, "number")}
          </div>
          <div id="dimGroup" class="grid grid-cols-2 gap-x-4" style="display:none">
            ${formField("Largeur (mm)", "f-width", w.specs.case_width || "", "number")}
            ${formField("Longueur (mm)", "f-height", w.specs.case_height || "", "number")}
          </div>
          <div class="grid grid-cols-2 gap-x-4">
            ${formField("Épaisseur (mm)", "f-thick", w.specs.case_thickness, "number")}
            ${formField("Entrecorne (mm)", "f-lug", w.specs.lug_to_lug, "number")}
            ${formField("Étanchéité", "f-wr", w.specs.water_resistance)}
          </div>
          ${formField("Matériau du boîtier", "f-material", w.specs.case_material, "text", [
            "Acier inoxydable","Oystersteel","Titane","Bronze","Céramique","Platine",
            "Or jaune 18 carats","Or rose 18 carats","Or gris 18 carats",
            "Acier et or jaune","Acier et or rose","Acier et platine"
          ])}
          ${formField("Bracelet", "f-bracelet", w.specs.bracelet_material || "Acier", "text", [
            "Acier","Cuir","Caoutchouc","Tissu / NATO","Céramique","Or jaune","Or rose","Milanais"
          ])}
          ${formField("Couleur du cadran", "f-dial", w.specs.dial_color, "text", ["Noir","Bleu","Argenté","Blanc","Vert","Bronze","Champagne","Gris"])}
          ${formField("Verre", "f-crystal", w.specs.crystal)}
          <p class="mono text-[10px] uppercase tracking-[0.2em] mb-3 mt-2" style="color:var(--gold)">Mouvement</p>
          <div class="grid grid-cols-2 gap-x-4">
            ${formField("Calibre", "f-caliber", w.movement.caliber)}
            ${formField("Type", "f-movtype", w.movement.type, "text", ["Automatique","Manuel","Quartz","Mecha-Quartz"])}
            ${formField("Réserve de marche (h)", "f-reserve", w.movement.power_reserve, "number")}
            ${formField("Fréquence", "f-freq", w.movement.frequency)}
          </div>
        </div>
        <div class="md:col-span-2 flex gap-3 mt-2 pt-4 border-t hairline">
          <button type="submit" class="flex items-center gap-2 mono text-xs uppercase tracking-widest px-5 py-2.5 rounded-full" style="background:var(--gold); color:#0F1115">
            <i data-lucide="check" class="w-3.5 h-3.5"></i> Enregistrer
          </button>
          <button type="button" id="formCancel" class="mono text-xs uppercase tracking-widest px-5 py-2.5 rounded-full border hairline" style="color:var(--ink-dim)">
            Annuler
          </button>
        </div>
      </form>
    </div>
  `;
  overlay.classList.remove("hidden");
  overlay.classList.add("flex");
  document.body.style.overflow = "hidden";
  lucide.createIcons();

  function fileToDataURL(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderGalleryPreview(){
    const box = document.getElementById("galleryPreview");
    box.innerHTML = galleryDraft.map((src, i) => `
      <div class="relative w-16 h-16 rounded overflow-hidden border hairline">
        <img src="${src}" class="w-full h-full object-cover">
        <button type="button" class="gallery-remove absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center" data-i="${i}" style="background:rgba(0,0,0,.6)">
          <i data-lucide="x" class="w-2.5 h-2.5 text-white"></i>
        </button>
      </div>`).join("") || `<p class="mono text-[10px]" style="color:var(--ink-dim)">Aucune photo de galerie pour le moment.</p>`;
    lucide.createIcons();
    box.querySelectorAll(".gallery-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        galleryDraft.splice(parseInt(btn.dataset.i), 1);
        renderGalleryPreview();
      });
    });
  }
  renderGalleryPreview();

  function toggleShapeFields(){
    const shape = document.getElementById("f-shape").value;
    const isRect = shape === "Carré" || shape === "Rectangulaire";
    document.getElementById("diamGroup").style.display = isRect ? "none" : "grid";
    document.getElementById("dimGroup").style.display = isRect ? "grid" : "none";
  }
  document.getElementById("f-shape").addEventListener("change", toggleShapeFields);
  toggleShapeFields();

  document.getElementById("coverInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    coverDraft = await fileToDataURL(file);
    document.getElementById("coverPreview").src = coverDraft;
  });

  document.getElementById("galleryInput").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    const urls = await Promise.all(files.map(fileToDataURL));
    galleryDraft.push(...urls);
    renderGalleryPreview();
    e.target.value = "";
  });

  document.getElementById("formCancel").addEventListener("click", closeModal);
  document.getElementById("watchForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const g = id => document.getElementById(id).value.trim();
    const brand = g("f-brand") || "Sans nom", model = g("f-model") || "Sans modèle";
    const shape = g("f-shape") || "Rond";
    const isRect = shape === "Carré" || shape === "Rectangulaire";
    const width = parseFloat(g("f-width")) || 0;
    const height = parseFloat(g("f-height")) || 0;
    const diam = isRect ? Math.max(width, height) : (parseFloat(g("f-diam")) || 40);
    const updated = {
      id: existing ? existing.id : slugify(brand, model),
      brand, model,
      reference: g("f-reference"),
      price_estimate: g("f-price"),
      status: g("f-status"),
      production_status: g("f-prodstatus"),
      production_years: g("f-years"),
      official_url: g("f-url"),
      added_date: existing ? existing.added_date : new Date().toISOString().slice(0,10),
      cover_image: coverDraft,
      gallery_images: galleryDraft,
      specs: {
        case_shape: shape,
        case_diameter: diam,
        case_width: isRect ? width : null,
        case_height: isRect ? height : null,
        case_thickness: parseFloat(g("f-thick")) || 0,
        lug_to_lug: parseFloat(g("f-lug")) || 0,
        case_material: g("f-material"),
        bracelet_material: g("f-bracelet"),
        water_resistance: g("f-wr"),
        dial_color: g("f-dial"),
        crystal: g("f-crystal")
      },
      movement: {
        caliber: g("f-caliber"),
        type: g("f-movtype"),
        power_reserve: parseFloat(g("f-reserve")) || 0,
        frequency: g("f-freq")
      },
      personal_notes: document.getElementById("f-notes").value.trim()
    };
    if(existing){
      COLLECTION = COLLECTION.map(x => x.id === existing.id ? updated : x);
    } else {
      COLLECTION.push(updated);
    }
    saveWatchToSupabase(updated);
    refreshAllFiltersAndRender();
    closeModal();
  });
}
document.getElementById("addWatchBtn").addEventListener("click", ()=> openForm());

// ---------- EXPORT / IMPORT (sauvegarde sans stockage navigateur) ----------
document.getElementById("exportBtn").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(COLLECTION, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "watches.json";
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById("importBtn").addEventListener("click", ()=> document.getElementById("importInput").click());
document.getElementById("importInput").addEventListener("change", (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if(!Array.isArray(data)) throw new Error("Format invalide");
      COLLECTION = data.map(w => ({
        cover_image: watchGlyph("#B08D57", "#E4CB9A"),
        gallery_images: [],
        added_date: new Date().toISOString().slice(0,10),
        ...w
      }));
      for(const w of COLLECTION){
        saveWatchToSupabase(w);
      }
      refreshAllFiltersAndRender();
    }catch(err){
      alert("Le fichier importé n'est pas un JSON de collection valide.");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

// ---------- SEARCH ----------
document.getElementById("searchInput").addEventListener("input", (e)=>{
  state.search = e.target.value; render();
});
document.getElementById("searchInputMobile").addEventListener("input", (e)=>{
  state.search = e.target.value; render();
});
document.getElementById("searchToggleMobile").addEventListener("click", ()=>{
  document.getElementById("mobileSearchBar").classList.toggle("hidden");
});

// ---------- SORT ----------
document.getElementById("sortSelect").addEventListener("change", (e)=>{
  state.sort = e.target.value; render();
});

// ---------- DIAMETER RANGE ----------
const diamMinEl = document.getElementById("diamMin");
const diamMaxEl = document.getElementById("diamMax");
function updateDiam(){
  let a = parseInt(diamMinEl.value), b = parseInt(diamMaxEl.value);
  if(a > b){ [a,b] = [b,a]; }
  state.diamMin = a; state.diamMax = b;
  render();
}
diamMinEl.addEventListener("input", updateDiam);
diamMaxEl.addEventListener("input", updateDiam);

const priceMinEl = document.getElementById("priceMin");
const priceMaxEl = document.getElementById("priceMax");
function syncPriceRange(){
  const highest = Math.max(...COLLECTION.map(w => parsePrice(w.price_estimate)), 0);
  const ceiling = Math.max(500, Math.ceil(highest / 500) * 500);
  priceMinEl.max = ceiling;
  priceMaxEl.max = ceiling;
  state.priceMin = 0;
  state.priceMax = ceiling;
  priceMinEl.value = 0;
  priceMaxEl.value = ceiling;
}
function updatePrice(){
  let a = parseInt(priceMinEl.value), b = parseInt(priceMaxEl.value);
  if(a > b){ [a,b] = [b,a]; }
  state.priceMin = a; state.priceMax = b;
  render();
}
priceMinEl.addEventListener("input", updatePrice);
priceMaxEl.addEventListener("input", updatePrice);

// ---------- RESET ----------
document.getElementById("resetFilters").addEventListener("click", ()=>{
  state.search=""; state.status.clear(); state.brand.clear(); state.movement.clear();
  state.material.clear(); state.bracelet.clear(); state.dial.clear(); state.shape.clear();
  state.diamMin=30; state.diamMax=46; state.sort="added_desc";
  document.getElementById("searchInput").value = "";
  document.getElementById("searchInputMobile").value = "";
  document.getElementById("sortSelect").value = "added_desc";
  diamMinEl.value = 30; diamMaxEl.value = 46;
  syncPriceRange(); buildStatusFilters(); buildBrandFilters(); buildMovementFilters(); buildMaterialFilters(); buildBraceletFilters(); buildShapeFilters(); buildDialSwatches();
  render();
});

// ---------- DRAWER (mobile) ----------
const drawer = document.getElementById("filterDrawer");
const overlayBg = document.getElementById("drawerOverlay");
function openDrawer(){ drawer.classList.remove("-translate-x-full"); overlayBg.classList.remove("hidden"); }
function closeDrawer(){ drawer.classList.add("-translate-x-full"); overlayBg.classList.add("hidden"); }
document.getElementById("drawerToggle").addEventListener("click", openDrawer);
document.getElementById("drawerClose").addEventListener("click", closeDrawer);
overlayBg.addEventListener("click", closeDrawer);

// ---------- THEME ----------
const themeBtn = document.getElementById("themeToggle");
function setTheme(mode){
  document.documentElement.classList.toggle("light", mode==="light");
  document.documentElement.classList.toggle("dark", mode==="dark");
  themeBtn.innerHTML = mode==="dark"
    ? '<i data-lucide="moon" class="w-4 h-4" style="color:var(--ink)"></i>'
    : '<i data-lucide="sun" class="w-4 h-4" style="color:var(--ink)"></i>';
  lucide.createIcons();
}
let currentTheme = "dark";
themeBtn.addEventListener("click", ()=>{
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  setTheme(currentTheme);
});

// ---------- INIT ----------
(async function init(){
  setTheme(currentTheme);
  await loadCollectionFromSupabase();
  refreshAllFiltersAndRender();
  subscribeToRealtimeChanges();
})();

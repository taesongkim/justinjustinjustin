"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

// ===== CONSTANTS =====
const YEAR_START = 1850;
const YEAR_END = 2015;
const Y_SCALE = 0.5;
const yearToY = (year) => -(year - YEAR_START) * Y_SCALE;

const SCHOOLS = {
  psychoanalysis: { color: "#3b82f6", label: "Psychoanalysis" },
  analytical: { color: "#a855f7", label: "Analytical Psychology" },
  bodyOriented: { color: "#ef4444", label: "Body-Oriented / Sex-Economy" },
  bioenergetics: { color: "#f97316", label: "Bioenergetic Analysis" },
  coreEnergetics: { color: "#eab308", label: "Core Energetics" },
  pathwork: { color: "#c084fc", label: "Pathwork" },
  gentleBio: { color: "#ec4899", label: "Gentle Bio-Energetics" },
  orgonomy: { color: "#b91c1c", label: "Orgonomy (Reichian)" },
  individualPsych: { color: "#14b8a6", label: "Individual Psychology" },
};

const EVENT_TYPES = {
  publication: { color: "#60a5fa", label: "Publication" },
  conflict: { color: "#f87171", label: "Conflict / Split" },
  concept: { color: "#34d399", label: "Concept / Milestone" },
  institutional: { color: "#fbbf24", label: "Institutional" },
};

// ===== DATA =====
const people = [
  {
    id: "freud", name: "Sigmund Freud", birth: 1856, death: 1939,
    school: "psychoanalysis", x: 0, z: 0,
    contribution: "Founded psychoanalysis. Developed theories of the unconscious, dream interpretation, free association, and transference. Central figure from whom all branches in this lineage descend.",
    differenceFromTeacher: "Originator — no predecessor in this lineage.",
    source: "https://www.britannica.com/biography/Sigmund-Freud",
  },
  {
    id: "adler", name: "Alfred Adler", birth: 1870, death: 1937,
    school: "individualPsych", x: -4, z: -5,
    contribution: "Founded Individual Psychology. Introduced the inferiority complex, the striving for superiority (self-realization), social interest (Gemeinschaftsgefühl), and birth-order theory. Established over 30 child-guidance clinics in Vienna.",
    differenceFromTeacher: "Rejected Freud's emphasis on sexuality as the primary drive. Argued that social connectedness and the striving to overcome feelings of inferiority — not libido — were the core motivators of human behavior. Emphasized conscious, goal-directed action over unconscious determinism.",
    source: "https://www.britannica.com/biography/Alfred-Adler",
  },
  {
    id: "jung", name: "Carl Jung", birth: 1875, death: 1961,
    school: "analytical", x: 7, z: -3,
    contribution: "Founded analytical psychology. Developed archetypes, the collective unconscious, and individuation. Brought spiritual and mythological dimensions to depth psychology.",
    differenceFromTeacher: "Rejected Freud's insistence on sexuality as the universal driver of the psyche. Embraced spirituality, mythology, and the numinous — areas Freud considered unscientific.",
    source: "https://www.britannica.com/biography/Carl-Jung",
  },
  {
    id: "ferenczi", name: "Sandor Ferenczi", birth: 1873, death: 1933,
    school: "psychoanalysis", x: -6, z: -2,
    contribution: "Pioneer of active therapeutic intervention, the 'holding environment,' and trauma theory. Anticipated Winnicott, Alexander, and aspects of body-oriented psychotherapy.",
    differenceFromTeacher: "Revived Freud's abandoned seduction/trauma theory. Believed patients' accounts of abuse. Advocated mutual analysis, emotional attunement, and active intervention over Freud's detached neutrality.",
    source: "https://www.britannica.com/biography/Sandor-Ferenczi",
  },
  {
    id: "reich", name: "Wilhelm Reich", birth: 1897, death: 1957,
    school: "bodyOriented", x: 0, z: 6,
    contribution: "Developed character analysis, muscular armoring theory, and orgastic potency as a criterion for mental health. Bridged psychoanalysis and body-oriented therapy. Later developed orgone energy theory.",
    differenceFromTeacher: "Radicalized Freud's libido theory into a somatic, political project. Insisted the body itself held neurosis (muscular armor). Integrated Marxism. Moved from talk therapy to hands-on body work.",
    source: "https://www.britannica.com/biography/Wilhelm-Reich",
  },
  {
    id: "lowen", name: "Alexander Lowen", birth: 1910, death: 2008,
    school: "bioenergetics", x: -5, z: 11,
    contribution: "Co-founded Bioenergetic Analysis with Pierrakos. Developed grounding exercises, stress positions, and character typology based on body structure. Published 14 books.",
    differenceFromTeacher: "Shifted focus from Reich's singular emphasis on orgastic potency to a broader model of self-expression, pleasure, and energetic aliveness. Integrated ego psychology. Made body therapy more accessible.",
    source: "https://en.wikipedia.org/wiki/Alexander_Lowen",
  },
  {
    id: "pierrakos", name: "John Pierrakos", birth: 1921, death: 2001,
    school: "coreEnergetics", x: 4, z: 11,
    contribution: "Co-founded Bioenergetics, then developed Core Energetics — integrating body-oriented psychotherapy with the Pathwork spiritual framework (via wife Eva Pierrakos).",
    differenceFromTeacher: "Added a spiritual/transpersonal dimension absent from both Reich and Lowen. Incorporated the Pathwork model (mask/lower self/higher self). Believed lasting healing required 'owning the lower self' — not just energetic release.",
    source: "https://www.coreenergetics.org/john-pierrakos/",
  },
  {
    id: "evapierrakos", name: "Eva Pierrakos", birth: 1915, death: 1979,
    school: "pathwork", x: 8, z: 13,
    contribution: "Channeled 258 Pathwork lectures (1957–1979) providing a comprehensive spiritual psychology. Developed the framework of the Mask (false self), Lower Self, Higher Self, and Life Task — concepts that became the spiritual foundation of John Pierrakos's Core Energetics.",
    differenceFromTeacher: "Not from the psychotherapy lineage. Brought an entirely different modality — channeled spiritual teaching — which John Pierrakos synthesized with Reichian body work to create Core Energetics.",
    source: "https://pathwork.org/eva-pierrakos/",
  },
  {
    id: "baker", name: "Elsworth Baker", birth: 1903, death: 1985,
    school: "orgonomy", x: 6, z: 5,
    contribution: "Preserved and systematized Reich's orgonomic methods after Reich's death. Founded the American College of Orgonomy and the Journal of Orgonomy.",
    differenceFromTeacher: "Continuator rather than innovator. Maintained 'orthodox' Reichian practice while Lowen and Pierrakos developed new directions. Represented the institutional preservation of Reich's original framework.",
    source: "https://orgonomy.org/articles/Baker/Wilhelm_Reich.html",
  },
  {
    id: "evareich", name: "Eva Reich", birth: 1924, death: 2008,
    school: "gentleBio", x: -3, z: 8,
    contribution: "Adapted her father's work into Gentle Bio-Energetics. Developed the Butterfly Touch Massage technique for premature infants. Lectured in 30+ countries from the 1970s onward.",
    differenceFromTeacher: "Transformed Reich's sometimes forceful body interventions into an extremely gentle, preventive approach focused on infants and early bonding. Applied armoring prevention rather than armoring removal.",
    source: "https://en.wikipedia.org/wiki/Eva_Reich",
  },
];

const events = [
  { year: 1895, personId: "freud", type: "publication", title: "Studies on Hysteria", desc: "Co-authored with Josef Breuer. Introduced the 'talking cure' and laid groundwork for psychoanalysis.", source: "https://iep.utm.edu/freud/" },
  { year: 1900, personId: "freud", type: "publication", title: "The Interpretation of Dreams", desc: "Foundational work arguing dreams are the 'royal road to the unconscious.' Introduced wish-fulfillment theory.", source: "https://www.britannica.com/biography/Sigmund-Freud" },
  { year: 1905, personId: "freud", type: "publication", title: "Three Essays on the Theory of Sexuality", desc: "Systematic theory of human psychosexual development. Highly controversial at the time.", source: "https://www.britannica.com/biography/Sigmund-Freud" },
  { year: 1902, personId: "adler", type: "concept", title: "Adler joins Freud's Wednesday Society", desc: "Adler was among the first four physicians invited by Freud to join his Wednesday evening discussion group, the nucleus of the psychoanalytic movement.", source: "https://www.britannica.com/biography/Alfred-Adler" },
  { year: 1911, personId: "adler", type: "conflict", title: "Adler breaks with Freud", desc: "After escalating theoretical disagreements, Adler resigned as president of the Vienna Psychoanalytic Society in June 1911. He was the first major figure to break from psychoanalysis, forming the Society for Free Psychoanalytic Research.", source: "https://www.britannica.com/biography/Alfred-Adler" },
  { year: 1912, personId: "adler", type: "institutional", title: "Society for Individual Psychology founded", desc: "Adler formally established the Society for Individual Psychology, marking the institutional beginning of his independent school.", source: "https://www.britannica.com/biography/Alfred-Adler" },
  { year: 1921, personId: "adler", type: "institutional", title: "First child-guidance clinic in Vienna", desc: "Adler opened the first of over 30 child-guidance clinics in the Vienna public school system, pioneering community-based mental health work with children and families.", source: "https://www.britannica.com/biography/Alfred-Adler" },
  { year: 1927, personId: "adler", type: "publication", title: "Understanding Human Nature published", desc: "Major popular work presenting Individual Psychology to a general audience. Based on a year of public lectures in Vienna, it became an international bestseller.", source: "https://www.britannica.com/biography/Alfred-Adler" },
  { year: 1906, personId: "jung", type: "concept", title: "Jung begins correspondence with Freud", desc: "After reading The Interpretation of Dreams, Jung initiates contact. Start of intense intellectual partnership.", source: "https://www.britannica.com/biography/Carl-Jung" },
  { year: 1908, personId: "ferenczi", type: "concept", title: "Ferenczi meets Freud (Feb 2)", desc: "First meeting in Vienna. Immediate rapport leads to Ferenczi becoming Freud's closest disciple — invited to summer with Freud's family, an unprecedented honor.", source: "https://www.britannica.com/biography/Sandor-Ferenczi" },
  { year: 1909, personId: "jung", type: "institutional", title: "Freud & Jung at Clark University", desc: "Both lecture at Clark University, Worcester, MA (Sept 6–19). High point of their collaboration. Joint trip to America.", source: "https://commons.clarku.edu/freudhall/" },
  { year: 1913, personId: "jung", type: "conflict", title: "Freud-Jung rupture", desc: "Freud writes: 'I propose that we abandon our relations entirely.' Irreconcilable split over the role of sexuality, spirituality, and the nature of the unconscious.", source: "https://www.openculture.com/2014/06/the-famous-letter-where-freud-breaks-his-relationship-with-jung-1913.html" },
  { year: 1920, personId: "reich", type: "institutional", title: "Reich joins Vienna Psychoanalytic Assoc.", desc: "Accepted as a member while still a medical student — virtually unprecedented. Recognized early as exceptionally talented.", source: "https://www.britannica.com/biography/Wilhelm-Reich" },
  { year: 1924, personId: "reich", type: "institutional", title: "Reich becomes director of training", desc: "Appointed to the Vienna Psychoanalytic Institute faculty. Chairs the influential technical seminars. Launches worker mental-health clinics.", source: "https://wilhelmreichmuseum.org/about/biography-of-wilhelm-reich/" },
  { year: 1927, personId: "reich", type: "publication", title: "The Function of the Orgasm", desc: "Presented to Freud on his 70th birthday (1926). Published 1927. Freud called it 'valuable, rich in clinical material.' Introduced orgastic potency as health criterion.", source: "https://en.wikipedia.org/wiki/The_Function_of_the_Orgasm" },
  { year: 1932, personId: "ferenczi", type: "conflict", title: "'Confusion of Tongues' paper", desc: "Delivered at Wiesbaden Congress (Sept 1932). Argued children's reports of sexual abuse are truthful — directly challenging Freud's abandonment of seduction theory. Freud accused him of regression and psychosis.", source: "https://pubmed.ncbi.nlm.nih.gov/20002813/" },
  { year: 1933, personId: "reich", type: "publication", title: "Character Analysis published", desc: "Major work on character armor and muscular armoring. Freud's press initially accepted it, then cancelled to distance from Reich's radical politics. Published independently.", source: "https://en.wikipedia.org/wiki/Character_Analysis" },
  { year: 1934, personId: "reich", type: "conflict", title: "Reich expelled from the IPA", desc: "Expelled from the International Psychoanalytic Association in August 1934 for political radicalism and theoretical deviations. Forced exile from psychoanalytic mainstream.", source: "https://www.britannica.com/biography/Wilhelm-Reich" },
  { year: 1942, personId: "lowen", type: "concept", title: "Lowen begins therapy with Reich", desc: "Alexander Lowen enters personal therapy and training with Wilhelm Reich in New York. Beginning of the bioenergetics lineage.", source: "https://en.wikipedia.org/wiki/Alexander_Lowen" },
  { year: 1950, personId: "evareich", type: "concept", title: "Butterfly Touch Massage developed", desc: "Eva Reich develops a light-touch technique for premature infants at Harlem Hospital. Radical application of her father's concepts to infant care and bonding.", source: "https://en.wikipedia.org/wiki/Eva_Reich" },
  { year: 1956, personId: "lowen", type: "institutional", title: "Bioenergetic Institute co-founded", desc: "October 2, 1956: Lowen and Pierrakos found the International Institute for Bioenergetic Analysis. Formalizes their adaptation of Reichian work.", source: "https://bioenergetic-therapy.com/index.php/en/bioenergetic-analysis/history-of-ba" },
  { year: 1957, personId: "evapierrakos", type: "concept", title: "Pathwork lectures begin", desc: "Eva begins channeling the Pathwork lectures — 258 lectures delivered through 1979 providing a comprehensive spiritual psychology of transformation.", source: "https://pathwork.org/eva-pierrakos/" },
  { year: 1968, personId: "baker", type: "institutional", title: "American College of Orgonomy founded", desc: "Elsworth Baker founds the ACO in Princeton, NJ, to preserve and teach Reich's original methods after his death in 1957.", source: "https://orgonomy.org/articles/Baker/Wilhelm_Reich.html" },
  { year: 1969, personId: "pierrakos", type: "conflict", title: "Pierrakos splits from Lowen", desc: "After disagreements over direction — Pierrakos felt Lowen relied too exclusively on energetic release — Pierrakos leaves to found the Center for the New Man.", source: "https://en.wikipedia.org/wiki/John_Pierrakos" },
  { year: 1971, personId: "evapierrakos", type: "concept", title: "Eva marries John Pierrakos", desc: "Marriage catalyzes the integration of Pathwork spiritual framework with John's body-oriented therapy, laying the groundwork for Core Energetics.", source: "https://www.encyclopedia.com/science/encyclopedias-almanacs-transcripts-and-maps/pierrakos-eva-1915-1979" },
  { year: 1972, personId: "evapierrakos", type: "institutional", title: "Pathwork Center opens", desc: "First Pathwork Center opens in the Catskill Mountains near Phoenicia, New York. Becomes a residential community for study and practice.", source: "https://pathwork.org/eva-pierrakos/" },
  { year: 1973, personId: "pierrakos", type: "institutional", title: "Institute of Core Energetics founded", desc: "Pierrakos establishes Core Energetics in New York City, synthesizing body-oriented therapy with the Pathwork spiritual framework.", source: "https://www.coreenergetics.org/john-pierrakos/" },
  { year: 1975, personId: "lowen", type: "publication", title: "Bioenergetics (book) published", desc: "Major synthesizing work bringing bioenergetic analysis to a wide audience. Explains character types, grounding, and the body-mind connection.", source: "https://en.wikipedia.org/wiki/Alexander_Lowen" },
  { year: 1997, personId: "evareich", type: "institutional", title: "Gentle Bio-Energetics Institute founded", desc: "Eva Reich formalizes her gentler adaptation of Reichian methods into an institute, focused on prevention and early intervention.", source: "https://en.wikipedia.org/wiki/Eva_Reich" },
];

const relationships = [
  { from: "freud", to: "adler", type: "colleague", startYear: 1902, endYear: 1911, label: "Early collaborator (1902-1911). Adler was among the first four members of Freud's Wednesday Society and became president of the Vienna Psychoanalytic Society, but broke away over fundamental disagreements about the role of sexuality." },
  { from: "freud", to: "jung", type: "mentor", startYear: 1906, endYear: 1913, label: "Intense collaboration (1906-1913), ended in bitter rupture over sexuality and spirituality" },
  { from: "freud", to: "ferenczi", type: "mentor", startYear: 1908, endYear: 1932, label: "Closest disciple (1908-1932). Ferenczi was in Freud's 'inner circle.' Relationship deteriorated over trauma theory." },
  { from: "freud", to: "reich", type: "mentor", startYear: 1920, endYear: 1934, label: "Student and rising star (1920-1934). Expelled from movement over politics and radical sexology." },
  { from: "reich", to: "lowen", type: "mentor", startYear: 1942, endYear: 1957, label: "Personal therapy and training (1942-1957). Lowen became Reich's principal successor in therapeutic practice." },
  { from: "reich", to: "pierrakos", type: "mentor", startYear: 1945, endYear: 1957, label: "Student of Reich in the 1940s-50s. Developed body work further alongside Lowen." },
  { from: "reich", to: "baker", type: "mentor", startYear: 1946, endYear: 1957, label: "Worked together 11 years. Baker became the principal 'orthodox' Reichian after Reich's death." },
  { from: "reich", to: "evareich", type: "parent", startYear: 1924, endYear: 1957, label: "Daughter. Continued and adapted her father's legacy into gentler, prevention-focused methods." },
  { from: "lowen", to: "pierrakos", type: "colleague", startYear: 1956, endYear: 1969, label: "Co-founders of Bioenergetic Analysis (1956). Split in 1969 over the role of spirituality." },
  { from: "evapierrakos", to: "pierrakos", type: "partner", startYear: 1969, endYear: 1979, label: "Co-founded Center for the New Man (1969). Married 1971. Eva's Pathwork became the spiritual foundation of Core Energetics." },
];

const globalEvents = [
  {
    id: "ww1", title: "World War I", yearStart: 1914, yearEnd: 1918,
    impactRank: 9, // first global industrial war, reshaped geopolitics
    desc: "Ferenczi served as a military doctor treating war neuroses. 'Shell shock' cases reshaped psychoanalytic thinking on trauma. Freud's sons served at the front. The catastrophic violence led Freud to develop the death drive concept in 'Beyond the Pleasure Principle' (1920).",
    impact: "War neuroses fueled psychoanalytic theorizing on trauma; Ferenczi's direct clinical experience shaped his later emphasis on empathy and the reality of suffering.",
    source: "https://www.britannica.com/event/World-War-I",
  },
  {
    id: "flu", title: "Spanish Flu Pandemic", yearStart: 1918, yearEnd: 1920,
    impactRank: 7, // 50-100M deaths, but shorter cultural footprint
    desc: "Global pandemic killing 50–100 million people. Freud's daughter Sophie died in January 1920. Some scholars link this personal loss to his development of the death drive (Thanatos) concept shortly after.",
    impact: "Personal bereavement may have catalyzed Freud's turn toward the death drive, a theoretical shift that reverberated through all subsequent schools.",
    source: "https://www.britannica.com/event/influenza-pandemic-of-1918-1919",
  },
  {
    id: "nazism", title: "Rise of Nazism", yearStart: 1933, yearEnd: 1933,
    impactRank: 8, // triggered WWII, reshaped Europe
    desc: "Hitler becomes Chancellor of Germany. Psychoanalysis branded a 'Jewish science.' Reich's books burned in Berlin alongside Freud's. Mass emigration of analysts from German-speaking Europe begins. Reich forced to flee Germany.",
    impact: "Reich expelled from Germany, beginning his exile trajectory to Scandinavia and then the US. Fragmented the European psychoanalytic community.",
    source: "https://www.britannica.com/event/Nazism",
  },
  {
    id: "anschluss", title: "Anschluss", yearStart: 1938, yearEnd: 1938,
    impactRank: 5, // regional but pivotal for this lineage
    desc: "Nazi annexation of Austria in March 1938. Freud, age 82, forced to flee Vienna to London. His four sisters later died in concentration camps. The Viennese psychoanalytic community — birthplace of the movement — was destroyed.",
    impact: "Freud's forced exile and death in London (1939). The institutional center of psychoanalysis was permanently erased from Vienna.",
    source: "https://www.britannica.com/event/Anschluss",
  },
  {
    id: "ww2", title: "World War II", yearStart: 1939, yearEnd: 1945,
    impactRank: 10, // largest global conflict in history
    desc: "Destroyed the European psychoanalytic community. Freud died in London exile (1939). Reich, Lowen, Pierrakos, and Baker all ended up in the United States as a direct or indirect result. The center of psychoanalysis shifted permanently from Vienna/Berlin to New York.",
    impact: "Relocated the entire body-oriented lineage to America. Without WWII, the Lowen–Pierrakos collaboration in New York likely never happens.",
    source: "https://www.britannica.com/event/World-War-II",
  },
  {
    id: "mccarthyism", title: "McCarthyism / Red Scare", yearStart: 1947, yearEnd: 1957,
    impactRank: 3, // US-focused political phenomenon
    desc: "Anti-communist hysteria in the US. Wilhelm Reich, with his Marxist past and controversial orgone research, was targeted by the FDA. Orgone accumulators injuncted (1954). His books were burned by the US government in 1956. Reich died in federal prison in November 1957.",
    impact: "Directly destroyed Reich and his institutional legacy. His imprisonment and book-burning radicalized his followers and created a martyrdom narrative.",
    source: "https://www.britannica.com/topic/McCarthyism",
  },
  {
    id: "counterculture", title: "1960s Counterculture", yearStart: 1964, yearEnd: 1972,
    impactRank: 4, // cultural movement, not military/geopolitical
    desc: "Sexual liberation, anti-authoritarianism, and interest in altered states created massive demand for body-oriented and humanistic therapies. Esalen Institute (est. 1962) became a hub. Lowen's and Pierrakos's work reached wide audiences. Reich was posthumously embraced as a countercultural hero.",
    impact: "Popularized bioenergetics and body therapy. Lowen published his major works during this period. Pierrakos encountered the Pathwork community.",
    source: "https://www.britannica.com/topic/counterculture",
  },
  {
    id: "vietnam", title: "Vietnam War", yearStart: 1955, yearEnd: 1975,
    impactRank: 6, // decades-long, massive cultural impact, PTSD legacy
    desc: "Fueled the counterculture that embraced alternative psychotherapy. Later, recognition of PTSD in Vietnam veterans (formalized in DSM-III, 1980) renewed clinical interest in body-based trauma work and validated somatic approaches to psychological injury.",
    impact: "PTSD recognition legitimized body-oriented trauma therapy. Created institutional demand for somatic methods.",
    source: "https://www.britannica.com/event/Vietnam-War",
  },
];

// ===== HELPERS =====
function createTextSprite(text, opts = {}) {
  const { fontSize = 40, color = "#ffffff", bold = false, maxWidth = 512 } = opts;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = maxWidth;
  canvas.height = 96;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${bold ? "bold " : ""}${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, sizeAttenuation: true });
  const sprite = new THREE.Sprite(mat);
  const aspect = canvas.width / canvas.height;
  const scale = opts.scale || 5;
  sprite.scale.set(scale, scale / aspect, 1);
  return sprite;
}

function smoothstep(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

// Compute a curved 3D path for a person's lifespan pillar.
// The path bends toward collaborators during active relationship periods.
function computePersonPath(person, allPeople, allRels) {
  const pts = [];
  const RAMP = 3; // years to ease in/out
  const STRENGTH = 1.6;
  const MAX_OFFSET = 3.0;

  for (let yr = person.birth; yr <= person.death; yr++) {
    let ox = 0, oz = 0;

    allRels.forEach((rel) => {
      let otherId = null;
      if (rel.from === person.id) otherId = rel.to;
      else if (rel.to === person.id) otherId = rel.from;
      if (!otherId) return;

      const other = allPeople.find((p) => p.id === otherId);
      if (!other) return;

      const s = rel.startYear;
      const e = rel.endYear || Math.min(person.death, other.death);
      if (yr < s - RAMP || yr > e + RAMP) return;

      let ramp = 1;
      if (yr < s) ramp = smoothstep((yr - (s - RAMP)) / RAMP);
      else if (yr > e) ramp = smoothstep(1 - (yr - e) / RAMP);

      const dx = other.x - person.x;
      const dz = other.z - person.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.01) return;

      ox += (dx / dist) * STRENGTH * ramp;
      oz += (dz / dist) * STRENGTH * ramp;
    });

    const oDist = Math.sqrt(ox * ox + oz * oz);
    if (oDist > MAX_OFFSET) { ox = (ox / oDist) * MAX_OFFSET; oz = (oz / oDist) * MAX_OFFSET; }

    pts.push(new THREE.Vector3(person.x + ox, yearToY(yr), person.z + oz));
  }

  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
}

// Create text label wrapped around a cylinder edge (maps onto CylinderGeometry UVs)
function createWrappedLabel(text, radius, yPos, cx, cz) {
  // Canvas width maps to full circumference; height maps to label band height.
  // To keep characters naturally proportioned, match canvas aspect to world aspect.
  const circ = 2 * Math.PI * radius;
  const labelH = 0.7;
  const aspect = circ / labelH; // world-space aspect ratio
  const canvasH = 256;
  const canvasW = Math.round(canvasH * aspect); // proportional to circumference
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvasW, canvasH);
  const fontSize = Math.round(canvasH * 0.52);
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#c8d4de";
  // Two copies on opposite sides so text is readable from any orbit angle
  ctx.fillText(text, canvasW * 0.25, canvasH / 2);
  ctx.fillText(text, canvasW * 0.75, canvasH / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const geo = new THREE.CylinderGeometry(radius, radius, labelH, 64, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, side: THREE.FrontSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, yPos, cz);
  return mesh;
}

// Get position along a person's curve at a given year
function getPosAtYear(curve, person, yr) {
  const lifespan = person.death - person.birth;
  if (lifespan <= 0) return new THREE.Vector3(person.x, yearToY(yr), person.z);
  const t = Math.max(0, Math.min(1, (yr - person.birth) / lifespan));
  return curve.getPoint(t);
}

// ===== MAIN COMPONENT =====
export default function PsychologistLineage() {
  const containerRef = useRef(null);
  const threeRef = useRef({});
  const cameraState = useRef({
    theta: Math.PI * 0.3,
    phi: Math.PI * 0.35,
    distance: 60,
    target: new THREE.Vector3(1, yearToY(1925), 4),
  });
  const mouseState = useRef({ dragging: false, panning: false, prev: { x: 0, y: 0 }, start: { x: 0, y: 0 } });
  const interactiveObjs = useRef([]);

  const [selected, setSelected] = useState(null);
  const [year, setYear] = useState(1925);
  const [legendOpen, setLegendOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [personVis, setPersonVis] = useState(() => Object.fromEntries(people.map(p => [p.id, true])));
  const [globalEventVis, setGlobalEventVis] = useState(() => Object.fromEntries(globalEvents.map(g => [g.id, true])));

  const updateCamera = useCallback(() => {
    const cam = threeRef.current.camera;
    if (!cam) return;
    const s = cameraState.current;
    cam.position.set(
      s.target.x + s.distance * Math.sin(s.phi) * Math.sin(s.theta),
      s.target.y + s.distance * Math.cos(s.phi),
      s.target.z + s.distance * Math.sin(s.phi) * Math.cos(s.theta)
    );
    cam.lookAt(s.target);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const W = el.clientWidth;
    const H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0f172a");
    scene.fog = new THREE.FogExp2("#0f172a", 0.007);

    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 300);
    threeRef.current.camera = camera;
    threeRef.current.scene = scene;
    updateCamera();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    threeRef.current.renderer = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0x8888aa, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(15, 20, 10);
    scene.add(dirLight);
    scene.add(new THREE.DirectionalLight(0x6366f1, 0.2).position.set(-10, -30, -5) && new THREE.DirectionalLight(0x6366f1, 0.2));

    // Year markers
    for (let y = 1860; y <= 2010; y += 10) {
      const yPos = yearToY(y);
      const isMajor = y % 50 === 0;
      const size = isMajor ? 15 : 12;
      const geo = new THREE.RingGeometry(size - 0.03, size, 64);
      const mat = new THREE.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: isMajor ? 0.3 : 0.12, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(1, yPos, 4);
      scene.add(ring);
      const lbl = createTextSprite(String(y), { fontSize: isMajor ? 42 : 34, color: isMajor ? "#b0bec5" : "#6b7a8d", scale: 4.5 });
      lbl.position.set(size + 2.5, yPos, 4);
      scene.add(lbl);
    }

    // Timeline plane
    const planeGeo = new THREE.PlaneGeometry(34, 0.06);
    const planeMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const timelinePlane = new THREE.Mesh(planeGeo, planeMat);
    timelinePlane.rotation.x = Math.PI / 2;
    timelinePlane.position.set(1, yearToY(1925), 4);
    scene.add(timelinePlane);
    threeRef.current.timelinePlane = timelinePlane;

    const interactive = [];

    // ===== COMPUTE ALL CURVED PATHS =====
    const personCurves = {};
    people.forEach((p) => {
      personCurves[p.id] = computePersonPath(p, people, relationships);
    });

    // Feathered tube helper: smoothly graduated concentric layers
    // Each layer: [radius, opacity, colorMix] where colorMix 0=col, 1=white
    function addFeatheredTube(crv, segs, col, layers, parent) {
      const white = new THREE.Color("#ffffff");
      const target = parent || scene;
      let hitMesh = null;
      layers.forEach(([r, op, mix], i) => {
        const c = col.clone().lerp(white, mix);
        const geo = new THREE.TubeGeometry(crv, segs, r, 8, false);
        const mat = new THREE.MeshBasicMaterial({
          color: c, transparent: true, opacity: op,
          blending: THREE.AdditiveBlending, depthWrite: false,
          side: i > layers.length * 0.5 ? THREE.BackSide : THREE.FrontSide,
        });
        const m = new THREE.Mesh(geo, mat);
        target.add(m);
        if (i === 2) hitMesh = m; // mid-layer for raycasting
      });
      return hitMesh;
    }

    // Feathered sphere helper
    function addFeatheredSphere(position, col, layers, parent) {
      const white = new THREE.Color("#ffffff");
      const target = parent || scene;
      layers.forEach(([r, op, mix]) => {
        const c = col.clone().lerp(white, mix);
        const geo = new THREE.SphereGeometry(r, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
          color: c, transparent: true, opacity: op,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(position);
        target.add(m);
      });
    }

    // ===== CURVED PILLARS — FEATHERED BEAMS OF LIGHT =====
    // 10 graduated layers from white-hot core to soft atmospheric haze
    const PILLAR_LAYERS = [
      [0.025, 0.95, 0.85],  // white-hot pinpoint
      [0.045, 0.70, 0.65],  // bright core
      [0.07,  0.50, 0.45],  // warm transition
      [0.10,  0.35, 0.30],  // colored bright
      [0.14,  0.24, 0.18],  // mid colored
      [0.19,  0.16, 0.10],  // inner glow
      [0.26,  0.10, 0.05],  // glow
      [0.36,  0.06, 0.02],  // outer glow
      [0.50,  0.03, 0.0],   // haze
      [0.70,  0.015, 0.0],  // atmospheric
    ];

    const FLARE_LAYERS = [
      [0.06, 0.90, 0.80],
      [0.12, 0.55, 0.55],
      [0.19, 0.30, 0.30],
      [0.28, 0.15, 0.10],
      [0.40, 0.06, 0.0],
      [0.55, 0.025, 0.0],
    ];

    people.forEach((p) => {
      const pGroup = new THREE.Group();
      pGroup.name = `person-${p.id}`;
      const curve = personCurves[p.id];
      const col = new THREE.Color(SCHOOLS[p.school].color);
      const lifespan = p.death - p.birth;
      const segments = Math.max(20, lifespan * 2);

      const hitMesh = addFeatheredTube(curve, segments, col, PILLAR_LAYERS, pGroup);
      if (hitMesh) {
        hitMesh.userData = { type: "person", data: p };
        interactive.push(hitMesh);
      }

      // Birth & death point flares (feathered)
      const birthPos = curve.getPoint(0);
      const deathPos = curve.getPoint(1);
      addFeatheredSphere(birthPos, col, FLARE_LAYERS, pGroup);
      addFeatheredSphere(deathPos, col, FLARE_LAYERS, pGroup);

      // Name label (above birth point) — doubled size
      const nameSprite = createTextSprite(p.name, { fontSize: 36, color: SCHOOLS[p.school].color, bold: true, scale: 10 });
      nameSprite.position.set(birthPos.x, birthPos.y + 2, birthPos.z);
      pGroup.add(nameSprite);

      // Dates label (right under name, same color) — closer to name
      const dateSprite = createTextSprite(`${p.birth}–${p.death}`, { fontSize: 26, color: SCHOOLS[p.school].color, scale: 3.5 });
      dateSprite.position.set(birthPos.x, birthPos.y + 1.5, birthPos.z);
      pGroup.add(dateSprite);
      scene.add(pGroup);
    });

    // ===== EVENTS (disc shapes around pillars, flat in X-Z plane) =====
    // publication=multi-ring, conflict=jagged ring, concept=pulsing disc, institutional=solid disc
    const conceptDiscs = []; // stored for pulsing animation
    const DISC_ROT = Math.PI / 2; // lay flat in X-Z plane

    events.forEach((ev) => {
      const person = people.find((p) => p.id === ev.personId);
      if (!person) return;
      const curve = personCurves[ev.personId];
      if (!curve) return;

      const pos = getPosAtYear(curve, person, ev.year);

      // Color matches the pillar (school color)
      const col = new THREE.Color(SCHOOLS[person.school].color);
      const white = new THREE.Color("#ffffff");

      // Orient disc flat in X-Z plane (horizontal)
      const discGroup = new THREE.Group();
      discGroup.position.copy(pos);
      discGroup.rotation.x = DISC_ROT;

      if (ev.type === "publication") {
        // Multiple concentric torus rings (2× size)
        for (let r = 0; r < 3; r++) {
          const radius = 0.60 + r * 0.30;
          const tubeR = 0.028 - r * 0.004;
          const geo = new THREE.TorusGeometry(radius, tubeR, 8, 48);
          const mat = new THREE.MeshBasicMaterial({
            color: col.clone().lerp(white, 0.55 - r * 0.12),
            transparent: true, opacity: 0.75 - r * 0.15,
            blending: THREE.AdditiveBlending, depthWrite: false,
          });
          discGroup.add(new THREE.Mesh(geo, mat));
        }
        // Soft glow ring
        const glowGeo = new THREE.TorusGeometry(0.84, 0.18, 8, 48);
        discGroup.add(new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
          color: col, transparent: true, opacity: 0.06,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })));

      } else if (ev.type === "conflict") {
        // Jagged ring — sine-wave modulated radius for rounded teeth (2× size)
        const shape = new THREE.Shape();
        const nPts = 120;
        const baseR = 0.72;
        const amp = 0.20;
        const freq = 10;
        for (let i = 0; i <= nPts; i++) {
          const a = (i / nPts) * Math.PI * 2;
          const r = baseR + amp * Math.sin(freq * a);
          if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        const hole = new THREE.Path();
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          if (i === 0) hole.moveTo(Math.cos(a) * 0.40, Math.sin(a) * 0.40);
          else hole.lineTo(Math.cos(a) * 0.40, Math.sin(a) * 0.40);
        }
        shape.holes.push(hole);
        discGroup.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({
          color: col.clone().lerp(white, 0.45),
          transparent: true, opacity: 0.6,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        })));
        // Outer glow layer
        const glowShape = new THREE.Shape();
        for (let i = 0; i <= nPts; i++) {
          const a = (i / nPts) * Math.PI * 2;
          const r = baseR + amp * Math.sin(freq * a) + 0.16;
          if (i === 0) glowShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else glowShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        const glowHole = new THREE.Path();
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          if (i === 0) glowHole.moveTo(Math.cos(a) * 0.32, Math.sin(a) * 0.32);
          else glowHole.lineTo(Math.cos(a) * 0.32, Math.sin(a) * 0.32);
        }
        glowShape.holes.push(glowHole);
        discGroup.add(new THREE.Mesh(new THREE.ShapeGeometry(glowShape), new THREE.MeshBasicMaterial({
          color: col, transparent: true, opacity: 0.1,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        })));

      } else if (ev.type === "concept") {
        // Solid base disc (like publication) + expanding/fading ripple rings
        const baseGeo = new THREE.CircleGeometry(0.70, 32);
        discGroup.add(new THREE.Mesh(baseGeo, new THREE.MeshBasicMaterial({
          color: col.clone().lerp(white, 0.45),
          transparent: true, opacity: 0.45,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        })));
        // Soft glow behind base
        const baseGlowGeo = new THREE.CircleGeometry(0.85, 32);
        discGroup.add(new THREE.Mesh(baseGlowGeo, new THREE.MeshBasicMaterial({
          color: col, transparent: true, opacity: 0.08,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        })));
        // Ripple rings — 3 rings, phase-staggered, expand and fade
        const NUM_RIPPLES = 3;
        const rippleRings = [];
        for (let r = 0; r < NUM_RIPPLES; r++) {
          const ringGeo = new THREE.TorusGeometry(0.70, 0.035, 8, 48);
          const ringMat = new THREE.MeshBasicMaterial({
            color: col.clone().lerp(white, 0.5),
            transparent: true, opacity: 0.6,
            blending: THREE.AdditiveBlending, depthWrite: false,
          });
          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          discGroup.add(ringMesh);
          rippleRings.push(ringMesh);
        }
        conceptDiscs.push({ group: discGroup, rings: rippleRings, phaseOffset: pos.y });

      } else {
        // Institutional — solid disc (2× size)
        const geo = new THREE.RingGeometry(0.40, 1.00, 32);
        discGroup.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
          color: col.clone().lerp(white, 0.4),
          transparent: true, opacity: 0.65,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        })));
        const glowGeo = new THREE.RingGeometry(0.30, 1.20, 32);
        discGroup.add(new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
          color: col, transparent: true, opacity: 0.08,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        })));
      }

      const evGroup = new THREE.Group();
      evGroup.name = `event-${ev.personId}-${ev.year}`;
      evGroup.add(discGroup);

      // Invisible hit target for raycasting (flat in X-Z plane)
      const hitGeo = new THREE.RingGeometry(0.30, 1.10, 16);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.copy(pos);
      hitMesh.rotation.x = DISC_ROT;
      evGroup.add(hitMesh);
      hitMesh.userData = { type: "event", data: { ...ev, personName: person.name, personSchool: person.school } };
      interactive.push(hitMesh);
      scene.add(evGroup);
    });

    // ===== RELATIONSHIPS — LIGHT-BEAM CONNECTIONS =====
    const REL_COLORS = { mentor: 0x94a3b8, colleague: 0x22d3ee, parent: 0xf472b6, partner: 0xc084fc };
    const REL_LABELS = { mentor: "mentor", colleague: "colleagues", parent: "parent-child", partner: "partners" };

    relationships.forEach((rel) => {
      const fromP = people.find((p) => p.id === rel.from);
      const toP = people.find((p) => p.id === rel.to);
      if (!fromP || !toP) return;
      const fromCurve = personCurves[rel.from];
      const toCurve = personCurves[rel.to];
      if (!fromCurve || !toCurve) return;
      const relGroup = new THREE.Group();
      relGroup.name = `rel-${rel.from}-${rel.to}`;

      const color = new THREE.Color(REL_COLORS[rel.type] || 0x64748b);

      // Connection arc — from origin to JUST BEFORE target (gap)
      const fromPos = getPosAtYear(fromCurve, fromP, rel.startYear);
      const toPos = getPosAtYear(toCurve, toP, rel.startYear);

      // Pull endpoints: start slightly out from origin, end with gap before target
      const dir = new THREE.Vector3().subVectors(toPos, fromPos);
      const totalLen = dir.length();
      const gapSize = 0.5; // gap before target pillar
      const embedSize = 0.0; // start from origin center (ball is embedded there)
      const endPos = fromPos.clone().add(dir.clone().normalize().multiplyScalar(totalLen - gapSize));

      const mid = new THREE.Vector3(
        (fromPos.x + endPos.x) / 2,
        (fromPos.y + endPos.y) / 2 + Math.min(2.0, totalLen * 0.2),
        (fromPos.z + endPos.z) / 2
      );
      const arcCurve = new THREE.QuadraticBezierCurve3(fromPos, mid, endPos);

      // Arrowhead dimensions
      const coneLen = 0.35;
      const arcLength = arcCurve.getLength();
      const arcEnd = arcCurve.getPoint(1);
      const arcTangent = arcCurve.getTangent(1).normalize();
      const coneBase = arcEnd.clone().sub(arcTangent.clone().multiplyScalar(coneLen));

      // Trim the beam tube so it stops at the arrowhead base (not past it)
      const trimU = Math.max(0.3, (arcLength - coneLen) / arcLength);
      const trimPts = [];
      for (let i = 0; i <= 24; i++) {
        trimPts.push(arcCurve.getPointAt((i / 24) * trimU));
      }
      const trimmedArc = new THREE.CatmullRomCurve3(trimPts, false, "catmullrom", 0.5);

      // Feathered connection beam — trimmed to stop at arrowhead base
      addFeatheredTube(trimmedArc, 30, color, [
        [0.015, 0.85, 0.70],
        [0.03,  0.55, 0.50],
        [0.05,  0.35, 0.30],
        [0.08,  0.20, 0.15],
        [0.12,  0.10, 0.05],
        [0.17,  0.05, 0.0],
        [0.24,  0.02, 0.0],
      ], relGroup);

      // Feathered glowing origin ball (embedded in origin pillar)
      addFeatheredSphere(fromPos, color, [
        [0.08, 0.90, 0.75],
        [0.15, 0.50, 0.50],
        [0.22, 0.28, 0.25],
        [0.32, 0.14, 0.10],
        [0.42, 0.06, 0.02],
        [0.55, 0.025, 0.0],
      ], relGroup);

      // Feathered arrowhead — cone only (no shaft), wider for visibility
      const brightCone = color.clone().lerp(new THREE.Color("#ffffff"), 0.5);
      // Inner bright cone: base at coneBase, tip at arcEnd
      const arrowH1 = new THREE.ArrowHelper(arcTangent, coneBase, coneLen, brightCone.getHex(), coneLen, 0.20);
      arrowH1.cone.material = new THREE.MeshBasicMaterial({ color: brightCone, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
      arrowH1.line.material = new THREE.LineBasicMaterial({ transparent: true, opacity: 0 });
      relGroup.add(arrowH1);
      // Outer glow cone — slightly larger and set back
      const arrowH2 = new THREE.ArrowHelper(arcTangent, coneBase.clone().sub(arcTangent.clone().multiplyScalar(0.06)), coneLen + 0.06, color.getHex(), coneLen + 0.06, 0.30);
      arrowH2.cone.material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
      arrowH2.line.material = new THREE.LineBasicMaterial({ transparent: true, opacity: 0 });
      relGroup.add(arrowH2);

      // Relationship label — midway along stem, on the arc plane, capitalized
      const labelPt = arcCurve.getPointAt(0.5);
      const relColorCSS = "#" + color.getHexString();
      const labelText = (REL_LABELS[rel.type] || rel.type).toUpperCase();
      const relLbl = createTextSprite(labelText, { fontSize: 30, color: relColorCSS, bold: true, scale: 3.2 });
      relLbl.position.set(labelPt.x, labelPt.y + 0.2, labelPt.z);
      relGroup.add(relLbl);
      scene.add(relGroup);
    });

    // ===== GLOBAL EVENTS (transparent horizontal discs) =====
    // Per-event radius based on estimated global impact (impactRank 1-10)
    // Higher impact → larger radius, subtle differentiation for overlapping events
    const GLOBAL_RADIUS_BASE = 11.5;
    const GLOBAL_RADIUS_STEP = 0.25; // each rank adds 0.25 → range 12.0 to 14.0
    const GLOBAL_CX = 1, GLOBAL_CZ = 4;
    const GLOBAL_COL = new THREE.Color("#94a3b8");
    const globalParticleSystems = [];

    globalEvents.forEach((gev) => {
      const gevGroup = new THREE.Group();
      gevGroup.name = `globalEvent-${gev.id}`;
      const radius = GLOBAL_RADIUS_BASE + (gev.impactRank || 5) * GLOBAL_RADIUS_STEP;
      const yStart = yearToY(gev.yearStart);
      const yEnd = yearToY(gev.yearEnd);
      const isRange = gev.yearEnd !== gev.yearStart;

      // Transparent filled disc at start year
      const discGeo = new THREE.CircleGeometry(radius, 64);
      const discMat = new THREE.MeshBasicMaterial({
        color: GLOBAL_COL, transparent: true, opacity: 0.035,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(GLOBAL_CX, yStart, GLOBAL_CZ);
      gevGroup.add(disc);

      if (isRange) {
        // Filled disc at end year
        const disc2Geo = new THREE.CircleGeometry(radius, 64);
        const disc2 = new THREE.Mesh(disc2Geo, discMat.clone());
        disc2.rotation.x = -Math.PI / 2;
        disc2.position.set(GLOBAL_CX, yEnd, GLOBAL_CZ);
        gevGroup.add(disc2);

        // Transparent cylinder connecting start and end (the "fill" between discs)
        const cylHeight = Math.abs(yEnd - yStart);
        const cylY = (yStart + yEnd) / 2;
        const cylGeo = new THREE.CylinderGeometry(radius, radius, cylHeight, 64, 1, true);
        const cylMat = new THREE.MeshBasicMaterial({
          color: GLOBAL_COL, transparent: true, opacity: 0.018,
          side: THREE.DoubleSide, depthWrite: false,
        });
        const cyl = new THREE.Mesh(cylGeo, cylMat);
        cyl.position.set(GLOBAL_CX, cylY, GLOBAL_CZ);
        gevGroup.add(cyl);

        // Swirling vortex particles filling the cylinder
        // Density scaled to cylinder volume: ~540 per (R=3,H=5) reference → proportional
        const refVol = Math.PI * 3 * 3 * 5;
        const thisVol = Math.PI * radius * radius * cylHeight;
        const nPart = Math.max(60, Math.round(540 * (thisVol / refVol)));
        const pPos = new Float32Array(nPart * 3);
        const pPhases = new Float32Array(nPart);
        const pSpeeds = new Float32Array(nPart);
        for (let i = 0; i < nPart; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rd = Math.sqrt(Math.random()) * radius;
          pPos[i * 3]     = GLOBAL_CX + Math.cos(ang) * rd;
          pPos[i * 3 + 1] = cylY - cylHeight / 2 + Math.random() * cylHeight;
          pPos[i * 3 + 2] = GLOBAL_CZ + Math.sin(ang) * rd;
          pPhases[i] = Math.random() * Math.PI * 2;
          pSpeeds[i] = 0.5 + Math.random() * 1.0;
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({
          color: GLOBAL_COL, size: 1.2, transparent: true, opacity: 0.12,
          blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false,
        });
        const pts = new THREE.Points(pGeo, pMat);
        gevGroup.add(pts);
        globalParticleSystems.push({
          points: pts, posArr: pPos, phases: pPhases, speeds: pSpeeds,
          cx: GLOBAL_CX, cy: cylY, cz: GLOBAL_CZ, r: radius, h: cylHeight, n: nPart,
        });
      } else {
        // Single-year event: thin swirling disc of particles
        const nPart = 80;
        const thinH = 0.3;
        const pPos = new Float32Array(nPart * 3);
        const pPhases = new Float32Array(nPart);
        const pSpeeds = new Float32Array(nPart);
        for (let i = 0; i < nPart; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rd = Math.sqrt(Math.random()) * radius;
          pPos[i * 3]     = GLOBAL_CX + Math.cos(ang) * rd;
          pPos[i * 3 + 1] = yStart - thinH / 2 + Math.random() * thinH;
          pPos[i * 3 + 2] = GLOBAL_CZ + Math.sin(ang) * rd;
          pPhases[i] = Math.random() * Math.PI * 2;
          pSpeeds[i] = 0.5 + Math.random() * 1.0;
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({
          color: GLOBAL_COL, size: 1.2, transparent: true, opacity: 0.12,
          blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false,
        });
        const pts = new THREE.Points(pGeo, pMat);
        gevGroup.add(pts);
        globalParticleSystems.push({
          points: pts, posArr: pPos, phases: pPhases, speeds: pSpeeds,
          cx: GLOBAL_CX, cy: yStart, cz: GLOBAL_CZ, r: radius, h: thinH, n: nPart,
        });
      }

      // Wrapped label around disc/cylinder edge
      const yearLabel = isRange
        ? `${gev.yearStart}\u2013${gev.yearEnd}` : String(gev.yearStart);
      const lblText = `${yearLabel}  \u2022  ${gev.title.toUpperCase()}`;
      const lblY = isRange ? yStart - 0.5 : yStart;
      const wrappedLbl = createWrappedLabel(lblText, radius, lblY, GLOBAL_CX, GLOBAL_CZ);
      wrappedLbl.userData = { type: "globalEvent", data: gev };
      gevGroup.add(wrappedLbl);
      interactive.push(wrappedLbl);
      scene.add(gevGroup);
    });

    // Store global particle systems for animation loop
    threeRef.current.globalParticles = globalParticleSystems;

    interactiveObjs.current = interactive;

    threeRef.current.hoveredGroup = null;

    // ===== MOUSE / INPUT =====
    function onMouseDown(e) {
      const m = mouseState.current;
      m.dragging = true;
      m.panning = e.button === 2 || e.shiftKey;
      m.prev = { x: e.clientX, y: e.clientY };
      m.start = { x: e.clientX, y: e.clientY };
      renderer.domElement.style.cursor = m.panning ? "move" : "grabbing";
    }
    function onMouseMove(e) {
      const m = mouseState.current;
      if (!m.dragging) { doHover(e); return; }
      const dx = e.clientX - m.prev.x;
      const dy = e.clientY - m.prev.y;
      const cs = cameraState.current;
      if (m.panning) {
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
        cs.target.add(right.multiplyScalar(-dx * 0.06));
        cs.target.add(up.multiplyScalar(dy * 0.06));
      } else {
        cs.theta -= dx * 0.005;
        cs.phi = Math.max(0.15, Math.min(Math.PI - 0.15, cs.phi - dy * 0.005));
      }
      m.prev = { x: e.clientX, y: e.clientY };
      updateCamera();
    }
    function onMouseUp(e) {
      const m = mouseState.current;
      if (Math.abs(e.clientX - m.start.x) < 5 && Math.abs(e.clientY - m.start.y) < 5) doClick(e);
      m.dragging = false;
      m.panning = false;
      renderer.domElement.style.cursor = "grab";
    }
    function onWheel(e) {
      e.preventDefault();
      cameraState.current.distance = Math.max(12, Math.min(130, cameraState.current.distance + e.deltaY * 0.04));
      updateCamera();
    }
    function getNDC(e) {
      const r = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    }
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line = { threshold: 0.5 };

    function doClick(e) {
      raycaster.setFromCamera(getNDC(e), camera);
      const hits = raycaster.intersectObjects(interactive);
      if (hits.length > 0) setSelected(hits[0].object.userData);
      else setSelected(null);
    }
    // Hover glow: collect meshes that should animate, store orig + target opacities
    const glowMeshes = []; // { mesh, origOpacity, targetOpacity }

    // HTML overlay tooltip — positioned in screen space, always clear of cursor
    const tooltip = document.createElement("div");
    Object.assign(tooltip.style, {
      position: "fixed", pointerEvents: "none", zIndex: "9999",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: "14px", fontWeight: "bold", whiteSpace: "nowrap",
      padding: "0", borderRadius: "4px",
      opacity: "0", transition: "opacity 0.18s ease",
    });
    el.appendChild(tooltip);
    let tooltipVisible = false;

    function doHover(e) {
      raycaster.setFromCamera(getNDC(e), camera);
      const hits = raycaster.intersectObjects(interactive);

      // Clear previous glow targets (fade back to original)
      glowMeshes.forEach((g) => { g.targetOpacity = g.origOpacity; });
      // Default: hide tooltip
      tooltipVisible = false;

      if (hits.length > 0) {
        const obj = hits[0].object;
        renderer.domElement.style.cursor = "pointer";

        // Find the named parent group (person-*, event-*, globalEvent-*)
        let group = obj;
        while (group.parent && !group.name) group = group.parent;
        if (!group.name) group = obj.parent || obj;

        const isGlobal = group.name && group.name.startsWith("globalEvent-");
        const isPerson = group.name && group.name.startsWith("person-");
        const isEvent = group.name && group.name.startsWith("event-");

        // Show tooltip for person pillars (no background)
        if (isPerson && obj.userData && obj.userData.data) {
          const p = obj.userData.data;
          const col = SCHOOLS[p.school] ? SCHOOLS[p.school].color : "#ffffff";
          tooltip.textContent = p.name;
          tooltip.style.color = col;
          tooltip.style.background = "rgba(0,0,0,0.6)";
          tooltip.style.padding = "4px 10px";
          tooltip.style.left = (e.clientX + 16) + "px";
          tooltip.style.top = (e.clientY - 12) + "px";
          tooltipVisible = true;
        }

        // Show tooltip for personal events (with background)
        if (isEvent && obj.userData && obj.userData.data) {
          const d = obj.userData.data;
          const col = SCHOOLS[d.personSchool] ? SCHOOLS[d.personSchool].color : "#ffffff";
          tooltip.textContent = d.title || "Event";
          tooltip.style.color = col;
          tooltip.style.background = "rgba(0,0,0,0.6)";
          tooltip.style.padding = "4px 10px";
          tooltip.style.left = (e.clientX + 16) + "px";
          tooltip.style.top = (e.clientY - 12) + "px";
          tooltipVisible = true;
        }

        // Determine which meshes to glow
        const targets = [];
        if (isGlobal) {
          // Global events: only glow the label itself, not disc/cylinder/particles
          targets.push(obj);
        } else {
          // Person pillars & personal events: glow all visible meshes in group
          group.traverse((child) => {
            if (child.isMesh && child.material && child.material.transparent && child.material.visible !== false) {
              targets.push(child);
            }
            if (child.isSprite && child.material) {
              targets.push(child);
            }
          });
        }

        targets.forEach((mesh) => {
          // Check if already tracked
          let entry = glowMeshes.find((g) => g.mesh === mesh);
          if (!entry) {
            entry = { mesh, origOpacity: mesh.material.opacity, targetOpacity: mesh.material.opacity };
            glowMeshes.push(entry);
          }
          // Set boosted target — subtle for pillars/events, stronger for labels
          if (mesh.isSprite) {
            entry.targetOpacity = Math.min(1, entry.origOpacity * 1.3);
          } else if (isGlobal) {
            entry.targetOpacity = Math.min(1, entry.origOpacity * 2.0 + 0.15);
          } else {
            // Subtle glow for person pillars and personal events
            entry.targetOpacity = Math.min(1, entry.origOpacity * 1.4 + 0.04);
          }
        });
      } else {
        renderer.domElement.style.cursor = "grab";
      }
    }
    function onCtx(e) { e.preventDefault(); }

    const cvs = renderer.domElement;
    cvs.addEventListener("mousedown", onMouseDown);
    cvs.addEventListener("mousemove", onMouseMove);
    cvs.addEventListener("mouseup", onMouseUp);
    cvs.addEventListener("wheel", onWheel, { passive: false });
    cvs.addEventListener("contextmenu", onCtx);

    // Touch
    function onTS(e) {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        Object.assign(mouseState.current, { dragging: true, panning: false, prev: { x: t.clientX, y: t.clientY }, start: { x: t.clientX, y: t.clientY } });
      }
    }
    function onTM(e) {
      if (e.touches.length === 1 && mouseState.current.dragging) {
        e.preventDefault();
        const t = e.touches[0]; const m = mouseState.current;
        cameraState.current.theta -= (t.clientX - m.prev.x) * 0.005;
        cameraState.current.phi = Math.max(0.15, Math.min(Math.PI - 0.15, cameraState.current.phi - (t.clientY - m.prev.y) * 0.005));
        m.prev = { x: t.clientX, y: t.clientY };
        updateCamera();
      }
    }
    function onTE() { mouseState.current.dragging = false; }
    cvs.addEventListener("touchstart", onTS, { passive: true });
    cvs.addEventListener("touchmove", onTM, { passive: false });
    cvs.addEventListener("touchend", onTE);

    // Animation
    let animId, time = 0;
    function animate() {
      animId = requestAnimationFrame(animate);
      time += 0.01;
      // Animate concept disc ripple rings — expand outward and fade
      conceptDiscs.forEach((cd) => {
        const NUM_RIPPLES = cd.rings.length;
        cd.rings.forEach((ring, i) => {
          // Each ring cycles with a staggered phase
          const cycle = ((time * 0.18 + cd.phaseOffset * 0.1) + (i / NUM_RIPPLES)) % 1;
          // Scale from 1.0 (base disc size) to ~2.2
          const s = 1 + cycle * 1.2;
          ring.scale.set(s, s, 1);
          // Fade out as it expands: strong at start, gone by end
          ring.material.opacity = 0.55 * (1 - cycle) * (1 - cycle);
        });
      });

      // Animate global event swirling vortex particles
      const gPart = threeRef.current.globalParticles;
      if (gPart) {
        gPart.forEach((sys) => {
          const pos = sys.posArr;
          const halfH = sys.h / 2;

          for (let i = 0; i < sys.n; i++) {
            const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;

            // Swirling vortex: orbit around Y-axis at half speed
            const dx = pos[ix] - sys.cx;
            const dz = pos[iz] - sys.cz;
            const ang = 0.005 * sys.speeds[i];
            const ca = Math.cos(ang), sa = Math.sin(ang);
            pos[ix] = sys.cx + dx * ca - dz * sa;
            pos[iz] = sys.cz + dx * sa + dz * ca;
            // Gentle vertical drift
            pos[iy] += Math.sin(time + sys.phases[i]) * 0.0015;

            // Clamp within cylinder bounds
            const cdx = pos[ix] - sys.cx;
            const cdz = pos[iz] - sys.cz;
            const dist = Math.sqrt(cdx * cdx + cdz * cdz);
            if (dist > sys.r) {
              const sc = (sys.r) / dist;
              pos[ix] = sys.cx + cdx * sc;
              pos[iz] = sys.cz + cdz * sc;
            }
            pos[iy] = Math.max(sys.cy - halfH, Math.min(sys.cy + halfH, pos[iy]));
          }

          sys.points.geometry.attributes.position.needsUpdate = true;
        });
      }

      // Animate hover glow — lerp opacities toward targets
      for (let i = glowMeshes.length - 1; i >= 0; i--) {
        const g = glowMeshes[i];
        const diff = g.targetOpacity - g.mesh.material.opacity;
        if (Math.abs(diff) < 0.002) {
          g.mesh.material.opacity = g.targetOpacity;
          // Remove from tracking once fully faded back to original
          if (g.targetOpacity === g.origOpacity) glowMeshes.splice(i, 1);
        } else {
          g.mesh.material.opacity += diff * 0.12; // smooth lerp factor
        }
      }

      // Tooltip fade via CSS transition
      tooltip.style.opacity = tooltipVisible ? "1" : "0";

      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
      cvs.removeEventListener("mousedown", onMouseDown);
      cvs.removeEventListener("mousemove", onMouseMove);
      cvs.removeEventListener("mouseup", onMouseUp);
      cvs.removeEventListener("wheel", onWheel);
      cvs.removeEventListener("contextmenu", onCtx);
      cvs.removeEventListener("touchstart", onTS);
      cvs.removeEventListener("touchmove", onTM);
      cvs.removeEventListener("touchend", onTE);
      if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
      if (cvs.parentNode) cvs.parentNode.removeChild(cvs);
      renderer.dispose();
    };
  }, [updateCamera]);

  // Sync visibility state → Three.js group visibility
  useEffect(() => {
    const scene = threeRef.current.scene;
    if (!scene) return;

    // Toggle person groups + their events + relationships involving them
    people.forEach((p) => {
      const vis = !!personVis[p.id];
      const group = scene.getObjectByName(`person-${p.id}`);
      if (group) group.traverse((obj) => { obj.visible = vis; });

      // Also toggle person events
      events.filter((ev) => ev.personId === p.id).forEach((ev) => {
        const evGroup = scene.getObjectByName(`event-${ev.personId}-${ev.year}`);
        if (evGroup) evGroup.traverse((obj) => { obj.visible = vis; });
      });
    });

    // Relationships: visible only if both connected persons are visible
    relationships.forEach((rel) => {
      const vis = !!personVis[rel.from] && !!personVis[rel.to];
      const relGroup = scene.getObjectByName(`rel-${rel.from}-${rel.to}`);
      if (relGroup) relGroup.traverse((obj) => { obj.visible = vis; });
    });

    // Toggle global event groups
    globalEvents.forEach((g) => {
      const vis = !!globalEventVis[g.id];
      const group = scene.getObjectByName(`globalEvent-${g.id}`);
      if (group) group.traverse((obj) => { obj.visible = vis; });
    });
  }, [personVis, globalEventVis]);

  const onTimeline = (e) => {
    const y = parseInt(e.target.value);
    setYear(y);
    cameraState.current.target.y = yearToY(y);
    if (threeRef.current.timelinePlane) threeRef.current.timelinePlane.position.y = yearToY(y);
    updateCamera();
  };

  const panelBg = "rgba(15,23,42,0.92)";
  const panelBorder = "1px solid rgba(71,85,105,0.5)";

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100vh", position: "relative", overflow: "hidden", background: "#0f172a" }}>
      {/* TITLE */}
      <div style={{ position: "absolute", top: 16, left: 16, right: 320, zIndex: 10, pointerEvents: "none", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 700 }}>Lineage of Body-Oriented Psychotherapy</div>
        <div style={{ color: "#64748b", fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>
          Freud &rarr; Reich &rarr; Lowen & Pierrakos &nbsp;|&nbsp; Pillars curve toward each other during active relationships
          <br />Drag to orbit &middot; Scroll to zoom &middot; Shift+drag to pan &middot; Click pillars or events for details &amp; citations
        </div>
      </div>

      {/* TIMELINE */}
      <div style={{
        position: "absolute", bottom: 20, left: 60, right: 60, zIndex: 10,
        display: "flex", alignItems: "center", gap: 12, fontFamily: "system-ui, sans-serif",
        background: panelBg, borderRadius: 10, padding: "10px 16px", border: panelBorder, backdropFilter: "blur(8px)",
      }}>
        <span style={{ color: "#64748b", fontSize: 11, minWidth: 32 }}>1856</span>
        <input type="range" min={1856} max={2008} value={year} onChange={onTimeline} style={{ flex: 1, accentColor: "#6366f1", height: 4 }} />
        <span style={{ color: "#64748b", fontSize: 11, minWidth: 32, textAlign: "right" }}>2008</span>
        <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", background: "#1e293b", padding: "4px 14px", borderRadius: 6, minWidth: 48, textAlign: "center", border: "1px solid #334155" }}>{year}</div>
      </div>

      {/* LEGEND */}
      {legendOpen ? (
        <div style={{ position: "absolute", bottom: 85, left: 16, zIndex: 10, background: panelBg, borderRadius: 10, padding: "14px 16px", border: panelBorder, fontFamily: "system-ui, sans-serif", backdropFilter: "blur(8px)", minWidth: 190 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#e2e8f0", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Schools</span>
            <button onClick={() => setLegendOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>x</button>
          </div>
          {Object.values(SCHOOLS).map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ color: "#cbd5e1", fontSize: 11 }}>{s.label}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #334155", marginTop: 10, paddingTop: 10, marginBottom: 6 }}>
            <span style={{ color: "#e2e8f0", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Event shapes</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="3" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
              <circle cx="7" cy="7" r="6" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
            </svg>
            <span style={{ color: "#cbd5e1", fontSize: 11 }}>Publication</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="5" fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="2.2 1.1" />
            </svg>
            <span style={{ color: "#cbd5e1", fontSize: 11 }}>Conflict / Split</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="4.5" fill="#94a3b8" fillOpacity="0.15" stroke="#94a3b8" strokeWidth="0.8" />
            </svg>
            <span style={{ color: "#cbd5e1", fontSize: 11 }}>Concept (pulsing)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="5" fill="#94a3b8" fillOpacity="0.5" />
            </svg>
            <span style={{ color: "#cbd5e1", fontSize: 11 }}>Institutional</span>
          </div>
          <div style={{ borderTop: "1px solid #334155", marginTop: 10, paddingTop: 10, marginBottom: 2 }}>
            <span style={{ color: "#e2e8f0", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Connections</span>
          </div>
          {[
            { color: "#94a3b8", label: "Mentor \u2192 Student" },
            { color: "#22d3ee", label: "Colleagues" },
            { color: "#f472b6", label: "Parent \u2192 Child" },
            { color: "#c084fc", label: "Partners" },
          ].map((c) => (
            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 16, height: 2, background: c.color, flexShrink: 0 }} />
              <span style={{ color: "#cbd5e1", fontSize: 11 }}>{c.label}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #334155", marginTop: 10, paddingTop: 10, marginBottom: 2 }}>
            <span style={{ color: "#e2e8f0", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Global events</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <svg width="16" height="10" viewBox="0 0 16 10" style={{ flexShrink: 0 }}>
              <ellipse cx="8" cy="5" rx="7" ry="4" fill="#94a3b8" fillOpacity="0.1" stroke="none" />
              <text x="8" y="5.5" textAnchor="middle" fontSize="3.5" fill="#c8d4de" fontWeight="bold">ABC</text>
            </svg>
            <span style={{ color: "#cbd5e1", fontSize: 11 }}>Global disc (click edge text)</span>
          </div>
        </div>
      ) : (
        <button onClick={() => setLegendOpen(true)} style={{ position: "absolute", bottom: 85, left: 16, zIndex: 10, background: panelBg, border: panelBorder, borderRadius: 8, padding: "8px 14px", color: "#94a3b8", cursor: "pointer", fontSize: 11, fontFamily: "system-ui, sans-serif" }}>Legend</button>
      )}

      {/* FILTERS PANEL */}
      {filtersOpen ? (
        <div style={{
          position: "absolute", bottom: 85, right: 16, zIndex: 10, background: panelBg,
          borderRadius: 10, padding: "14px 16px", border: panelBorder,
          fontFamily: "system-ui, sans-serif", backdropFilter: "blur(8px)",
          minWidth: 200, maxHeight: "calc(100vh - 200px)", overflowY: "auto",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: "#e2e8f0", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Filters</span>
            <button onClick={() => setFiltersOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>x</button>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>People</div>
            {people.map((p) => (
              <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!personVis[p.id]}
                  onChange={() => setPersonVis((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                  style={{ accentColor: SCHOOLS[p.school].color, width: 13, height: 13, cursor: "pointer" }}
                />
                <div style={{ width: 8, height: 8, borderRadius: 2, background: SCHOOLS[p.school].color, flexShrink: 0 }} />
                <span style={{ color: personVis[p.id] ? "#cbd5e1" : "#475569", fontSize: 11, transition: "color 0.2s" }}>{p.name}</span>
              </label>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #334155", paddingTop: 10 }}>
            <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Global Events</div>
            {globalEvents.map((g) => (
              <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!globalEventVis[g.id]}
                  onChange={() => setGlobalEventVis((prev) => ({ ...prev, [g.id]: !prev[g.id] }))}
                  style={{ accentColor: "#94a3b8", width: 13, height: 13, cursor: "pointer" }}
                />
                <span style={{ color: globalEventVis[g.id] ? "#cbd5e1" : "#475569", fontSize: 11, transition: "color 0.2s" }}>
                  {g.title} ({g.yearStart === g.yearEnd ? g.yearStart : `${g.yearStart}\u2013${g.yearEnd}`})
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setFiltersOpen(true)} style={{
          position: "absolute", bottom: 85, right: 16, zIndex: 10, background: panelBg,
          border: panelBorder, borderRadius: 8, padding: "8px 14px", color: "#94a3b8",
          cursor: "pointer", fontSize: 11, fontFamily: "system-ui, sans-serif",
        }}>Filters</button>
      )}

      {/* INFO PANEL */}
      {selected && (
        <div style={{ position: "absolute", top: 16, right: 16, width: 300, maxHeight: "calc(100vh - 120px)", overflowY: "auto", background: panelBg, border: panelBorder, borderRadius: 12, padding: 20, zIndex: 10, fontFamily: "system-ui, sans-serif", backdropFilter: "blur(8px)" }}>
          <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>x</button>

          {selected.type === "person" && (() => {
            const p = selected.data;
            const si = SCHOOLS[p.school];
            const evts = events.filter((e) => e.personId === p.id);
            const rels = relationships.filter((r) => r.from === p.id || r.to === p.id);
            return (
              <>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: si.color, marginBottom: 10 }} />
                <div style={{ color: "#f1f5f9", fontSize: 17, fontWeight: 700, marginBottom: 2, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 14 }}>{p.birth}–{p.death} &middot; {si.label}</div>
                <div style={{ color: "#cbd5e1", fontSize: 12.5, lineHeight: 1.6, marginBottom: 14 }}>{p.contribution}</div>
                {p.differenceFromTeacher && (
                  <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 12px", marginBottom: 14, border: "1px solid #334155" }}>
                    <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Departure from teacher</div>
                    <div style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.5 }}>{p.differenceFromTeacher}</div>
                  </div>
                )}
                {evts.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Key events</div>
                    {evts.map((ev, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: si.color, marginTop: 5, flexShrink: 0 }} />
                        <div>
                          <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{ev.year}</span>
                          <span style={{ color: "#94a3b8", fontSize: 12 }}> — {ev.title}</span>
                          <div style={{ marginTop: 2 }}>
                            <a href={ev.source} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", fontSize: 10, textDecoration: "none" }}>cite</a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {rels.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Relationships</div>
                    {rels.map((r, i) => {
                      const other = r.from === p.id ? people.find((x) => x.id === r.to) : people.find((x) => x.id === r.from);
                      const dir = r.from === p.id ? "\u2192" : "\u2190";
                      return (
                        <div key={i} style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.5, marginBottom: 4 }}>
                          {dir} <span style={{ fontWeight: 600 }}>{other?.name}</span>: {r.label}
                        </div>
                      );
                    })}
                  </div>
                )}
                <a href={p.source} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", fontSize: 12, textDecoration: "none" }}>View primary source &#8599;</a>
              </>
            );
          })()}

          {selected.type === "event" && (() => {
            const ev = selected.data;
            const et = EVENT_TYPES[ev.type];
            const schoolCol = ev.personSchool ? SCHOOLS[ev.personSchool].color : et.color;
            return (
              <>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: schoolCol, marginBottom: 10 }} />
                <div style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700, marginBottom: 2, lineHeight: 1.3 }}>{ev.title}</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>{ev.year} &middot; {ev.personName} &middot; {et.label}</div>
                <div style={{ color: "#cbd5e1", fontSize: 12.5, lineHeight: 1.6, marginBottom: 16 }}>{ev.desc}</div>
                <a href={ev.source} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", fontSize: 12, textDecoration: "none" }}>View source &#8599;</a>
              </>
            );
          })()}

          {selected.type === "globalEvent" && (() => {
            const gev = selected.data;
            const yrLabel = gev.yearStart === gev.yearEnd
              ? String(gev.yearStart) : `${gev.yearStart}\u2013${gev.yearEnd}`;
            return (
              <>
                <div style={{ width: 24, height: 2, background: "#94a3b8", opacity: 0.5, marginBottom: 10, borderRadius: 1 }} />
                <div style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700, marginBottom: 2, lineHeight: 1.3 }}>{gev.title}</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>{yrLabel} &middot; Global Event</div>
                <div style={{ color: "#cbd5e1", fontSize: 12.5, lineHeight: 1.6, marginBottom: 14 }}>{gev.desc}</div>
                {gev.impact && (
                  <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 12px", marginBottom: 14, border: "1px solid #334155" }}>
                    <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Impact on this lineage</div>
                    <div style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.5 }}>{gev.impact}</div>
                  </div>
                )}
                <a href={gev.source} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", fontSize: 12, textDecoration: "none" }}>View source &#8599;</a>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

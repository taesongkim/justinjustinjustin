"use client";

import { useState } from "react";

type View = "cascade" | "nested";

// Interactive reference: the lower self, read two ways (causal cascade and
// structural nesting) behind a tab toggle.
export function LowerSelfGuide() {
  const [view, setView] = useState<View>("cascade");
  const tab = (id: View) => ({
    id: `ce-ls-tab-${id}`,
    role: "tab" as const,
    "aria-selected": view === id,
    "aria-controls": `ce-ls-panel-${id}`,
    tabIndex: view === id ? 0 : -1,
    onClick: () => setView(id),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        setView((v) => (v === "cascade" ? "nested" : "cascade"));
      }
    },
  });

  return (
    <article className="ce-ls">
      <p className="ce-eyebrow">Reference · Topic 1</p>
      <h1 className="ce-ls-title">The Lower Self</h1>
      <p className="ce-ls-lede">
        Wounded life energy, organized around separation and a negative
        intention. A position the energy holds, not a feeling that passes.
      </p>
      <p className="ce-ls-provenance">
        I worked this out with an AI collaborator over a few passes, trying to
        get the mechanics of the lower self more exact than the source synthesis
        had them. It&rsquo;s a working map — here to be argued with and revised,
        not taken as gospel.
      </p>

      <section className="ce-ls-section">
        <p className="ce-ls-kicker">What it is</p>
        <h2 className="ce-ls-h2">Life energy held by a negative intention</h2>
        <p className="ce-ls-sub">
          The same creative current you&rsquo;re made of, turned against
          connection. The work is to reclaim that energy, which is why it
          can&rsquo;t just be cut out.
        </p>
        <div className="ce-ls-marriage">
          <div className="ce-ls-mcell">
            <div className="ce-ls-mtag">the what</div>
            <div className="ce-ls-mterm">Life energy</div>
          </div>
          <div className="ce-ls-mop">×</div>
          <div className="ce-ls-mcell">
            <div className="ce-ls-mtag">the grip</div>
            <div className="ce-ls-mterm">Negative intention</div>
          </div>
          <div className="ce-ls-mop">=</div>
          <div className="ce-ls-mcell result">
            <div className="ce-ls-mtag">the bind</div>
            <div className="ce-ls-mterm">Lower self</div>
          </div>
        </div>
      </section>

      <section className="ce-ls-section">
        <p className="ce-ls-kicker">Two readings of one structure</p>
        <h2 className="ce-ls-h2">Compare the views</h2>
        <div
          className="ce-ls-tablist"
          role="tablist"
          aria-label="Two readings of the lower self"
        >
          <button className="ce-ls-tab" type="button" {...tab("cascade")}>
            <span className="ce-ls-tabname">Cascade</span>
            <span className="ce-ls-tabdesc">how it arises · top to bottom</span>
          </button>
          <button className="ce-ls-tab" type="button" {...tab("nested")}>
            <span className="ce-ls-tabname">Nested</span>
            <span className="ce-ls-tabdesc">how it&rsquo;s organized · outside in</span>
          </button>
        </div>

        <div
          className="ce-ls-panel"
          id="ce-ls-panel-cascade"
          role="tabpanel"
          aria-labelledby="ce-ls-tab-cascade"
          hidden={view !== "cascade"}
        >
          <p className="ce-ls-pintro">
            Separation, distortion, pleasure, and protection kept competing for
            the top slot. They don&rsquo;t sit on one ladder — each answers a
            different question. Sort the questions first; then read the layers
            downward, each giving rise to the next.
          </p>
          <div className="ce-ls-causes">
            <div className="ce-ls-cause">
              <p className="ce-ls-q"><b>1</b> Made of?</p>
              <p className="ce-ls-term">Life energy</p>
              <p className="ce-ls-gloss">The creative current itself.</p>
            </div>
            <div className="ce-ls-cause">
              <p className="ce-ls-q"><b>2</b> Comes from?</p>
              <p className="ce-ls-term">Pain-avoidance</p>
              <p className="ce-ls-gloss">The flight from an original hurt. The root.</p>
            </div>
            <div className="ce-ls-cause">
              <p className="ce-ls-q"><b>3</b> Makes it lower self?</p>
              <p className="ce-ls-term">Separation, held by intention</p>
              <p className="ce-ls-gloss">The attachment to distortion. The essence.</p>
            </div>
            <div className="ce-ls-cause">
              <p className="ce-ls-q"><b>4</b> What for?</p>
              <p className="ce-ls-term">Protection and pleasure</p>
              <p className="ce-ls-gloss">Safety, and a payoff that feels like a win.</p>
            </div>
          </div>
          <div className="ce-ls-strata">
            <div className="ce-ls-rail"><span className="ce-ls-arrow">▼</span></div>
            <div className="ce-ls-layers">
              <div className="ce-ls-layer root">
                <div className="ce-ls-role">Root · deepest</div>
                <p className="ce-ls-name">Avoid original pain</p>
                <p className="ce-ls-gloss">The taproot. Hold this position and you never have to feel what once broke you.</p>
              </div>
              <div className="ce-ls-layer aim">
                <div className="ce-ls-role">Aim · the shape</div>
                <p className="ce-ls-name">Separation</p>
                <p className="ce-ls-gloss">The current reversed — from connection into cut-off.</p>
              </div>
              <div className="ce-ls-layer engine">
                <div className="ce-ls-role">Engine · the will</div>
                <p className="ce-ls-name">Negative intention</p>
                <p className="ce-ls-gloss">The will that keeps separation in place, and the refusal to take responsibility for it. The hinge that makes energy lower self.</p>
              </div>
              <div className="ce-ls-layer payoff">
                <div className="ce-ls-role">Payoff · why it stays</div>
                <p className="ce-ls-name">Protection <span className="ce-ls-plus">+</span> negative pleasure</p>
                <p className="ce-ls-gloss">Safety from re-wounding, plus specialness, superiority, revenge.</p>
              </div>
              <div className="ce-ls-layer surface">
                <div className="ce-ls-role">Surface · how it acts</div>
                <p className="ce-ls-name">Tactics</p>
                <p className="ce-ls-gloss">Control, withholding, punishment, contempt.</p>
              </div>
            </div>
          </div>
          <p className="ce-ls-summary">
            In one line: <b>to avoid original pain, it wills separation through negative intention, and holds because separation pays — in safety and in pleasure.</b>
          </p>
        </div>

        <div
          className="ce-ls-panel"
          id="ce-ls-panel-nested"
          role="tabpanel"
          aria-labelledby="ce-ls-tab-nested"
          hidden={view !== "nested"}
        >
          <p className="ce-ls-pintro">
            The same pieces, read as containment. Each thing holds the next, all
            of it built around a wound it works to keep from touching.
          </p>
          <div className="ce-ls-face">
            <div className="ce-ls-facerole">The face it presents</div>
            <div className="ce-ls-faceline">
              <b>Protection</b> and <b>negative pleasure</b> — safety, and
              specialness, superiority, revenge.
            </div>
            <div className="ce-ls-facetactics">acted out as: control · withholding · punishment · contempt</div>
          </div>
          <p className="ce-ls-skincue">↓ &nbsp;the skin over&nbsp; ↓</p>
          <div className="ce-ls-nb ce-ls-distortion">
            <div className="ce-ls-nbhead">
              <span className="ce-ls-nbrole">Genus · the whole</span>
              <span className="ce-ls-nbname">Distortion</span>
            </div>
            <p className="ce-ls-nbgloss">Wounded life energy — the name for the whole thing.</p>
            <div className="ce-ls-nb ce-ls-intention">
              <div className="ce-ls-nbhead">
                <span className="ce-ls-nbrole">Essence · the will</span>
                <span className="ce-ls-nbname">Negative intention</span>
              </div>
              <p className="ce-ls-nbgloss">The will holding the shape in place, and the refusal to take responsibility.</p>
              <div className="ce-ls-nb ce-ls-separation">
                <div className="ce-ls-nbhead">
                  <span className="ce-ls-nbrole">Aim · what it wills</span>
                  <span className="ce-ls-nbname">Separation</span>
                </div>
                <p className="ce-ls-nbgloss">Cut-off — from feeling, from others, from responsibility.</p>
                <div className="ce-ls-core">
                  <div className="ce-ls-corerole">Core · the protected wound</div>
                  <div className="ce-ls-corename">Original pain</div>
                  <div className="ce-ls-coresub">the hurt the whole construction works to keep from feeling</div>
                </div>
              </div>
            </div>
          </div>
          <p className="ce-ls-readnote">
            Inward: <b>distortion → negative intention → separation → pain.</b> Each holds the next.
          </p>
        </div>
      </section>

      <section className="ce-ls-section">
        <p className="ce-ls-kicker">Two placements worth fixing</p>
        <h2 className="ce-ls-h2">Where the loose pieces go</h2>
        <div className="ce-ls-clar">
          <div className="ce-ls-aside">
            <h3>Distortion names the whole</h3>
            <p>It&rsquo;s the name for the entire thing, not one of the parts inside it. Separation is the particular form the distortion takes.</p>
          </div>
          <div className="ce-ls-aside">
            <h3>Separation sits under intention</h3>
            <p>Negative intention is the will. Separation is what that will is for. Keep separation nested beneath it.</p>
          </div>
        </div>
      </section>

      <section className="ce-ls-section ce-ls-notrow">
        <p className="ce-ls-kicker">Boundaries</p>
        <h2 className="ce-ls-h2">What it isn&rsquo;t</h2>
        <ul className="ce-ls-nots">
          <li>ordinary anger, fear, grief</li>
          <li>sexuality or need</li>
          <li>the body or instinct</li>
          <li>the inner child</li>
          <li>healthy aggression</li>
          <li>an evil to amputate</li>
          <li>a license to act out</li>
        </ul>
        <p className="ce-ls-notnote">
          The mark of the lower self is the attachment to distortion — the
          intention, the separation, the refusal of responsibility. The
          intensity of the feeling has nothing to do with it.
        </p>
        <div className="ce-ls-xref">
          <b>Ties to Topic 10.</b> Pride, self-will, and fear — the three faces —
          line up with the layers here: fear at the pain root, self-will as the
          negative intention, pride as the specialness payoff.
        </div>
      </section>

      <footer className="ce-ls-footer">
        Built from the study synthesis. The four-questions and containment
        framings are scaffolds for holding the parts in relation, not claims
        from the source.
      </footer>
    </article>
  );
}

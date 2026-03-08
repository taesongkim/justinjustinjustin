'use client';

import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';

/**
 * FadePrivacy TipTap extension
 *
 * When enabled, every character gets a per-character decoration that
 * animates from clear to blurred. When disabled, decorations switch to
 * a "reveal" class that animates back to clear, then are removed.
 *
 * Toggle via transaction meta:
 *   tr.setMeta('fadePrivacyToggle', true)       — animate from clear to blurred
 *   tr.setMeta('fadePrivacyToggle', 'instant')   — start already blurred (no animation)
 *   tr.setMeta('fadePrivacyToggle', false)        — animate from blurred to clear
 */

const fadePrivacyKey = new PluginKey('fadePrivacy');
const REVEAL_DURATION = 800; // ms, matches CSS transition

type Phase = 'off' | 'on' | 'revealing';

interface FadeState {
  phase: Phase;
  decorations: DecorationSet;
}

export const FadePrivacyExtension = Extension.create({
  name: 'fadePrivacy',

  addOptions() {
    return {
      enabled: false,
    };
  },

  addProseMirrorPlugins() {
    const initialEnabled = this.options.enabled;
    let revealTimer: ReturnType<typeof setTimeout> | null = null;

    return [
      new Plugin({
        key: fadePrivacyKey,
        view(editorView: EditorView) {
          return {
            destroy() {
              if (revealTimer) clearTimeout(revealTimer);
            },
          };
        },

        state: {
          init(_, state): FadeState {
            return {
              phase: initialEnabled ? 'on' : 'off',
              decorations: initialEnabled ? buildDecorations(state.doc, 'fade-privacy-char') : DecorationSet.empty,
            };
          },

          apply(tr, prev, _oldState, newState): FadeState {
            const toggle = tr.getMeta('fadePrivacyToggle');

            // Turning ON (animated or instant)
            if ((toggle === true || toggle === 'instant') && prev.phase !== 'on') {
              if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
              const className = toggle === 'instant' ? 'fade-privacy-char-instant' : 'fade-privacy-char';
              return {
                phase: 'on',
                decorations: buildDecorations(tr.doc, className),
              };
            }

            // Turning OFF → start reveal phase
            if (toggle === false && prev.phase === 'on') {
              // Schedule cleanup after reveal animation
              if (revealTimer) clearTimeout(revealTimer);
              const view = (this as unknown as { spec: { view: (v: EditorView) => unknown } }).spec;
              // We'll dispatch the cleanup from the useEffect side
              revealTimer = setTimeout(() => {
                // Dispatch a meta to clear decorations
                try {
                  const editorEl = document.querySelector('.writual-tiptap-editor');
                  if (editorEl) {
                    // Find the ProseMirror view — we need to dispatch from outside
                    // Use a custom event the React side listens for
                    editorEl.dispatchEvent(new CustomEvent('fadePrivacyRevealDone'));
                  }
                } catch { /* noop */ }
                revealTimer = null;
              }, REVEAL_DURATION);

              return {
                phase: 'revealing',
                decorations: buildDecorations(tr.doc, 'fade-privacy-char-reveal'),
              };
            }

            // Reveal done signal
            if (tr.getMeta('fadePrivacyRevealDone')) {
              return { phase: 'off', decorations: DecorationSet.empty };
            }

            // Already on — rebuild on doc changes
            if (prev.phase === 'on' && tr.docChanged) {
              return { phase: 'on', decorations: buildDecorations(tr.doc, 'fade-privacy-char') };
            }

            // Revealing phase — keep reveal decorations but update positions
            if (prev.phase === 'revealing' && tr.docChanged) {
              return { phase: 'revealing', decorations: buildDecorations(tr.doc, 'fade-privacy-char-reveal') };
            }

            return prev;
          },
        },

        props: {
          decorations(state) {
            const pluginState = this.getState(state) as FadeState | undefined;
            return pluginState?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

function buildDecorations(doc: Parameters<typeof DecorationSet.create>[0], className: string) {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        const from = pos + i;
        const to = from + 1;
        decorations.push(
          Decoration.inline(from, to, {
            class: className,
            nodeName: 'span',
          })
        );
      }
      return false;
    }
    return true;
  });

  return DecorationSet.create(doc, decorations);
}

export default FadePrivacyExtension;

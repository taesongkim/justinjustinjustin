'use client';

import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * FadePrivacy TipTap extension
 *
 * When enabled, every character in the document gets a per-character
 * inline decoration with a CSS animation that transitions from clear
 * to blurred. Newly typed characters start visible and gradually fade.
 *
 * Toggle via transaction meta: tr.setMeta('fadePrivacyToggle', true/false)
 */

const fadePrivacyKey = new PluginKey('fadePrivacy');

interface FadeState {
  enabled: boolean;
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

    return [
      new Plugin({
        key: fadePrivacyKey,

        state: {
          init(_, state): FadeState {
            return {
              enabled: initialEnabled,
              decorations: initialEnabled ? buildDecorations(state.doc) : DecorationSet.empty,
            };
          },

          apply(tr, prev): FadeState {
            const toggle = tr.getMeta('fadePrivacyToggle');
            const enabled = typeof toggle === 'boolean' ? toggle : prev.enabled;

            if (!enabled) {
              return { enabled, decorations: DecorationSet.empty };
            }

            if (tr.docChanged || typeof toggle === 'boolean') {
              return { enabled, decorations: buildDecorations(tr.doc) };
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

function buildDecorations(doc: Parameters<typeof DecorationSet.create>[0]) {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        const from = pos + i;
        const to = from + 1;
        decorations.push(
          Decoration.inline(from, to, {
            class: 'fade-privacy-char',
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

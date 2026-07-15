'use strict';

const assert = require('assert');
const { createLineageTreeModel, VIEW_STATES } = require('./inquiry_view_model');
const { escapeHtml, renderLineageTree } = require('./lineage_tree_renderer');

function run() {
  const tree = {
    id: 'tt:evt:root',
    body: { text: '<root inquiry>' },
    provenance: { sourceCount: 1, sourceProtocols: ['nostr'], sourceIds: ['raw-root'] },
    children: [{
      id: 'tt:evt:child',
      body: { text: 'translated inquiry' },
      relationships: [{ source: 'translated_from', target: 'tt:evt:root' }],
      provenance: { sourceCount: 1, sourceProtocols: ['lingonberry'], sourceIds: ['raw-child'] },
      children: [],
    }],
  };

  const model = createLineageTreeModel(tree, { selectedId: 'tt:evt:child' });
  const html = renderLineageTree(model, { detailBasePath: '/app/inquiries/' });
  assert.ok(html.includes('role="tree"'));
  assert.ok(html.includes('role="treeitem"'));
  assert.ok(html.includes('aria-current="true"'));
  assert.ok(html.includes('translated_from'));
  assert.ok(html.includes('lingonberry'));
  assert.ok(html.includes('/app/inquiries/tt%3Aevt%3Achild'));
  assert.ok(html.includes('&lt;root inquiry&gt;'));
  assert.ok(!html.includes('<root inquiry>'));

  assert.ok(renderLineageTree({ state: VIEW_STATES.LOADING }).includes('aria-busy="true"'));
  assert.ok(renderLineageTree({ state: VIEW_STATES.EMPTY, tree: null }).includes('表示できる系譜はありません'));
  assert.ok(renderLineageTree({ state: VIEW_STATES.ERROR, error: '<failed>' }).includes('&lt;failed&gt;'));
  assert.strictEqual(escapeHtml('"<&'), '&quot;&lt;&amp;');

  console.log('PASS lineage renderer produces escaped, keyboard-reachable tree markup and explicit UI states');
}

try {
  run();
} catch (error) {
  console.error('FAIL lineage tree renderer contract');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
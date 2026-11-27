const test = require('node:test');
const assert = require('node:assert/strict');
const {
  exportBookmarks,
  parseBackup,
  countBookmarks,
  extractGistFile,
  importBookmarks
} = require('../bookmark-data.js');

function fakeChrome(tree) {
  const created = [];
  const removed = [];
  let nextId = 1;
  return {
    runtime: {},
    bookmarks: {
      getTree(callback) { callback(tree); },
      removeTree(id, callback) { removed.push(id); callback(); },
      create(node, callback) {
        const createdNode = { id: `new-${nextId++}`, ...node };
        created.push(createdNode);
        callback(createdNode);
      }
    },
    created,
    removed
  };
}

test('exportBookmarks normalizes root folder titles and strips ids', () => {
  const tree = [{
    id: '0',
    title: '',
    children: [
      { id: '1', title: 'Bookmarks bar', children: [
        { id: '10', title: 'A', url: 'https://a.example' },
        { id: '11', title: 'Folder', children: [
          { id: '12', title: 'B', url: 'https://b.example' }
        ] }
      ] },
      { id: '2', title: 'Other bookmarks', children: [] }
    ]
  }];

  const payload = exportBookmarks(tree, { version: '9.9.9', browser: 'test' });

  assert.equal(payload.version, '9.9.9');
  assert.equal(payload.browser, 'test');
  assert.deepEqual(payload.bookmarks, [
    { title: 'ToolbarFolder', children: [
      { title: 'A', url: 'https://a.example' },
      { title: 'Folder', children: [
        { title: 'B', url: 'https://b.example' }
      ] }
    ] },
    { title: 'UnfiledFolder', children: [] }
  ]);
});

test('parseBackup accepts a payload with a bookmarks array', () => {
  const payload = parseBackup('{"bookmarks":[{"title":"A","url":"https://a"}]}');

  assert.deepEqual(payload.bookmarks, [{ title: 'A', url: 'https://a' }]);
});

test('parseBackup rejects invalid input', () => {
  assert.throws(() => parseBackup('not json'), /有效的 JSON/);
  assert.throws(() => parseBackup('{"files":{}}'), /bookmarks/);
});

test('countBookmarks counts only bookmark nodes', () => {
  assert.equal(countBookmarks([
    { title: 'A', url: 'https://a' },
    { title: 'Folder', children: [
      { title: 'B', url: 'https://b' },
      { title: 'Empty', children: [] }
    ] }
  ]), 2);
});

test('extractGistFile returns content and raw url', () => {
  assert.deepEqual(
    extractGistFile({ files: { BookmarkHub: { content: '{}', truncated: false, raw_url: 'https://raw' } } }, 'BookmarkHub'),
    { content: '{}', truncated: false, rawUrl: 'https://raw' }
  );
});

test('extractGistFile throws when the file is missing', () => {
  assert.throws(() => extractGistFile({ files: {} }, 'BookmarkHub'), /BookmarkHub/);
});

test('importBookmarks imports special root folders into the right parents', async () => {
  const chrome = fakeChrome([{ id: '0', children: [] }]);

  const created = await importBookmarks([
    { title: 'ToolbarFolder', children: [
      { title: 'A', url: 'https://a' },
      { title: 'Folder', children: [
        { title: 'B', url: 'https://b' }
      ] }
    ] },
    { title: 'MobileFolder', children: [
      { title: 'C', url: 'https://c' }
    ] }
  ], chrome, { clear: false });

  assert.equal(created, 3);
  assert.deepEqual(chrome.created.map(({ parentId, title, url }) => [parentId, title, url]), [
    ['1', 'A', 'https://a'],
    ['1', 'Folder', undefined],
    ['new-2', 'B', 'https://b'],
    ['3', 'C', 'https://c']
  ]);
});

test('importBookmarks clears the contents of top-level folders when clear is true', async () => {
  const chrome = fakeChrome([{
    id: '0',
    children: [
      { id: '1', children: [{ id: 'a' }, { id: 'b' }] },
      { id: '2', children: [{ id: 'c' }] }
    ]
  }]);

  await importBookmarks([{ title: 'A', url: 'https://a' }], chrome, { clear: true });

  assert.deepEqual(chrome.removed, ['a', 'b', 'c']);
  assert.equal(chrome.created[0].parentId, '2');
});

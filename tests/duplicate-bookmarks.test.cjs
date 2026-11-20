const test = require('node:test');
const assert = require('node:assert/strict');
const { findDuplicateBookmarks, getSelectAllIds } = require('../duplicate-bookmarks.js');

test('groups bookmarks only when their URLs are exactly identical', () => {
  const tree = [{
    title: 'Bookmarks bar',
    children: [
      { id: '1', title: 'First', url: 'https://example.com/page' },
      { id: '2', title: 'Second', url: 'https://example.com/page' },
      { id: '3', title: 'Different slash', url: 'https://example.com/page/' },
      { id: '4', title: 'Folder', children: [
        { id: '5', title: 'Nested duplicate', url: 'https://example.com/page' }
      ] }
    ]
  }];

  const groups = findDuplicateBookmarks(tree);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].url, 'https://example.com/page');
  assert.deepEqual(groups[0].bookmarks.map(({ id, path }) => ({ id, path })), [
    { id: '1', path: 'Bookmarks bar' },
    { id: '2', path: 'Bookmarks bar' },
    { id: '5', path: 'Bookmarks bar / Folder' }
  ]);
});

test('select all keeps one bookmark in every duplicate group', () => {
  const groups = [
    { bookmarks: [{ id: '1' }, { id: '2' }, { id: '3' }] },
    { bookmarks: [{ id: '4' }, { id: '5' }] },
    { bookmarks: [{ id: '6' }] }
  ];

  assert.deepEqual(getSelectAllIds(groups), ['2', '3', '5']);
});

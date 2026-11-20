/* Install our fetch adapter as Axios' default before the background app loads. */
(this.webpackJsonpbookmarkhub = this.webpackJsonpbookmarkhub || []).push([
  [99],
  {
    999: function (module, exports, require) {
      require(45).defaults.adapter = self.bookmarkHubFetchAdapter;
    }
  },
  [[999, 8]]
]);

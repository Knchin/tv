// Channel catalog. Add a new channel by appending an object here; the home
// page renders cards from this array, so no other UI change is required.
window.CHANNELS = [
  {
    id: "lb2",
    name: "LB2",
    description: "Live stream",
    // Fresh signed master playlist URL (media host allows CORS *, no referer).
    url:
      "https://games1.elahmad.store/tv13_www_elahmad._lb2/index.m3u8?token=2f3fd5c71f3c8bc3250daeeef9700bc671af75d2-49e0c0ae7e27597dfd6e8ad0b3ceb9e8-1788217447-1788215647",
  },
];

window.findChannel = function (id) {
  return (window.CHANNELS || []).find(function (c) {
    return c.id === id;
  });
};

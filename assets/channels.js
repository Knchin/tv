// Channel catalog. Add a new channel by appending an object here; the home
// page renders cards from this array, so no other UI change is required.
window.CHANNELS = [
  {
    id: "lb2",
    name: "LB2",
    description: "Live stream",
    // Fresh signed master playlist URL (media host allows CORS *, no referer).
    url:
      "https://games1.elahmad.store/tv14_www_elahmad._lb2/index.m3u8?token=99a42818f7c5e2d441e350d963325ea5024fb1da-8c0d2a0f2c05a9c5d939ea3f9b3dc19c-1788292767-1788290967",
  },
];

window.findChannel = function (id) {
  return (window.CHANNELS || []).find(function (c) {
    return c.id === id;
  });
};

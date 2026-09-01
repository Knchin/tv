// Channel catalog. Add a new channel by appending an object here; the home
// page renders cards from this array, so no other UI change is required.
window.CHANNELS = [
  {
    id: "lb2",
    name: "LB2",
    description: "Live stream",
    type: "hls",
    // Fresh signed master playlist URL (media host allows CORS *, no referer).
    url:
      "https://games1.elahmad.store/tv14_www_elahmad._lb2/index.m3u8?token=a5fc4b618a63b2086da7337cfa4de80ec695588f-6e7867881cd9bcc4f57714c7e183f232-1788295076-1788293276",
  },
  {
    id: "alhadath",
    name: "AlHadath",
    description: "AlHadath Live Stream (YouTube)",
    type: "youtube",
    url: "https://www.youtube.com/embed/8c-yPig6tIw?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0",
    youtubeId: "8c-yPig6tIw",
  },
];

window.findChannel = function (id) {
  return (window.CHANNELS || []).find(function (c) {
    return c.id === id;
  });
};
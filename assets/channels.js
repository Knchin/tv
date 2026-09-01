// Channel catalog. Add a new channel by appending an object here; the home
// page renders cards from this array, so no other UI change is required.
window.CHANNELS = [
  {
    id: "lb2",
    name: "LB2",
    description: "Live stream",
    // Fresh signed master playlist URL (media host allows CORS *, no referer).
    url:
      "https://games1.elahmad.store/tv14_www_elahmad._lb2/index.m3u8?token=0635cde8c0cb4bbca6741b3dd5d4d1c3ca0d91ff-d1c49752b0551250256f24ee4d520e77-1788293474-1788291674",
  },
];

window.findChannel = function (id) {
  return (window.CHANNELS || []).find(function (c) {
    return c.id === id;
  });
};

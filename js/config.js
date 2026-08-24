(function (global) {
  global.Atlas = global.Atlas || {};
  global.Atlas.PAGE_SIZE = 48;
  global.Atlas.API = "https://api.inaturalist.org/v1/taxa";
  global.Atlas.IMAGE_PROXY = "https://wsrv.nl/?url=";
  global.Atlas.CACHE_PREFIX = "atlas-palette-v1:";
  global.Atlas.EXTRACT_CONCURRENCY = 4;
})(window);

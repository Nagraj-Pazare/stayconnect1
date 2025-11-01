// src/js/filter.js
// small utility exported to global scope
window.filterByRent = function(list, maxRent){
  if (!list || !list.length) return [];
  return list.filter(item => Number(item.rent || 0) <= Number(maxRent || Infinity));
};

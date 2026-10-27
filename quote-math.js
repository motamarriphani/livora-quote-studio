/* Pure quote calculations shared by the browser and unit tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LivoraMath = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const positive = value => {
    const n = parseFloat(value);
    return isFinite(n) && n > 0 ? n : 0;
  };

  function itemAmount(item) {
    return item.lump ? positive(item.rate) : positive(item.w) * positive(item.h) * positive(item.rate);
  }

  function sectionTotal(section) {
    return (section.items || []).reduce((sum, item) => sum + itemAmount(item), 0);
  }

  function quoteTotal(sections) {
    return (sections || []).reduce((sum, section) => sum + sectionTotal(section), 0);
  }

  function taxableBase(total, finalCharge) {
    const final = positive(finalCharge);
    return final > 0 ? final : total;
  }

  function discountAmount(total, finalCharge) {
    const final = positive(finalCharge);
    return final ? Math.max(0, total - final) : 0;
  }

  function gstAmount(base, gst) {
    const rate = positive(gst);
    return rate ? Math.round(base * rate / 100) : 0;
  }

  function grandTotal(total, finalCharge, gst) {
    const base = taxableBase(total, finalCharge);
    return base + gstAmount(base, gst);
  }

  function itemCount(sections) {
    return (sections || []).reduce((sum, section) => sum + (section.items || []).length, 0);
  }

  return { itemAmount, sectionTotal, quoteTotal, taxableBase, discountAmount, gstAmount, grandTotal, itemCount };
});

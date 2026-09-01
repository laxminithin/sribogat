// Single source of truth for product pricing on the frontend.
// The backend serializer sends gstAmount and totalPrice (price + GST);
// the math here is only a fallback for items cached before those fields existed.
export function getPriceData(product) {
  const basePrice = parseFloat(product?.price) || 0;
  const gstRate = parseFloat(product?.gstRate ?? product?.gst) || 0;
  const gstAmount =
    product?.gstAmount != null
      ? parseFloat(product.gstAmount) || 0
      : Math.round(basePrice * gstRate) / 100;
  const totalPrice =
    product?.totalPrice != null
      ? parseFloat(product.totalPrice) || 0
      : Math.round((basePrice + gstAmount) * 100) / 100;

  return { basePrice, gstRate, gstAmount, totalPrice };
}

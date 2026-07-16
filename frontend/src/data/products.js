// Product Categories with subcategories
export const categories = [
  
  {
    name: "Bogat Products",
    subcategories: ["Products"]
  },
];


// Helper Functions
export const getProductsByCategory = (category, subcategory = null) => {
  return allProducts.filter(product => 
    product.category === category.toLowerCase() &&
    (!subcategory || product.subcategory === subcategory)
  );
};

export const getProductById = (id) => {
  return allProducts.find(product => product.id === id);
};

export const getFeaturedProducts = () => {
  return allProducts.filter(product => product.rating >= 4.5);
};

export const searchProducts = (query) => {
  const searchTerm = query.toLowerCase();
  return allProducts.filter(product => 
    product.name.toLowerCase().includes(searchTerm) ||
    product.description.toLowerCase().includes(searchTerm) ||
    product.category.toLowerCase().includes(searchTerm) ||
    product.subcategory.toLowerCase().includes(searchTerm)
  );
};
import React from 'react';
import ProductCatalog from './ProductCatalog'

const AllProductsPage = () => {
  return (
    <div className="pt-8">
      <ProductCatalog showAll={true} />
    </div>
  );
};

export default AllProductsPage;
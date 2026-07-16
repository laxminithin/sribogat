import React from 'react'
import HomeHero from './HomeHero'
import ProductCatalog from './ProductCatalog'
import HomeFeatures from './HomeFeatures'
import Blogs from './Blogs'

const Home = () => {
  return (
    <div>
        <HomeHero />
        <ProductCatalog />
        <Blogs/>
        <HomeFeatures />
    </div>
  )
}

export default Home;

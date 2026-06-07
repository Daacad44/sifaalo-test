import { useEffect, useState } from 'react';
import { getProducts } from '../api/services.js';
import ProductCard from '../components/ProductCard.jsx';
import CheckoutModal from '../components/CheckoutModal.jsx';

export default function Home({ testMode }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    getProducts()
      .then((data) => mounted && setProducts(data))
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          SifaloPay Test Store
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-500">
          A minimal storefront for verifying the SifaloPay payment integration
          end to end. All items are priced at $0.10 for safe testing.
        </p>
      </section>

      {loading && (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="card h-80 animate-pulse bg-slate-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-10 rounded-xl bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onBuy={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <CheckoutModal
          product={selected}
          testMode={testMode}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

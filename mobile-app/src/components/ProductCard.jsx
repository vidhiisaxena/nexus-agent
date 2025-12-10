// Product card component for mobile app
export default function ProductCard({ product }) {
  return (
    <div className="w-[140px] sm:w-[160px] bg-white rounded-lg shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex-shrink-0">
      <img
        src={product.imageUrl}
        alt={product.name}
        className="h-20 sm:h-24 w-full object-cover rounded-t-lg"
      />
      <div className="p-2">
        <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 mt-2">
          {product.name}
        </h3>
        <p className="text-sm font-bold text-blue-600 mt-1">
          ${product.price.toFixed(2)}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <div
            className={`w-2 h-2 rounded-full ${
              product.inStock ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span
            className={`text-xs ${
              product.inStock ? "text-green-600" : "text-red-600"
            }`}
          >
            {product.inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>
      </div>
    </div>
  );
}

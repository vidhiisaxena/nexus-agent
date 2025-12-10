import { MapPin, Heart } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function ProductCard({ product, index }) {
  const handleTryOn = () => {
    toast.success("Associate notified! Someone will be with you shortly.");
  };

  const handleWishlist = () => {
    toast.success("Added to wishlist.");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[400px] sm:min-h-[500px] transform transition-all duration-300 hover:shadow-2xl"
    >
      {/* Image Section */}
      <div className="relative h-48 sm:h-64 lg:h-80 w-full overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        {/* Stock Badge */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
          <span
            className={`px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 rounded-bl-lg rounded-tr-2xl text-xs sm:text-sm lg:text-lg font-semibold text-white ${
              product.inStock ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {product.inStock ? "✓ In Stock" : "✗ Out of Stock"}
          </span>
        </div>
      </div>

      {/* Info Section */}
      <div className="flex-1 p-4 sm:p-5 lg:p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
            {product.name}
          </h3>
          <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1 sm:mt-2">
            ${product.price.toFixed(2)}
          </p>
          <div className="flex items-center gap-2 text-base sm:text-lg lg:text-xl text-gray-600 mt-2 sm:mt-3">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Aisle {product.aisle}</span>
          </div>
          <p className="mt-2 sm:mt-3 italic text-sm sm:text-base lg:text-lg text-gray-500">
            {product.explanation}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 sm:mt-5 lg:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
          <button
            onClick={handleTryOn}
            disabled={!product.inStock}
            className="flex-1 h-12 sm:h-14 lg:h-16 bg-blue-600 text-white text-sm sm:text-base lg:text-xl font-semibold rounded-lg sm:rounded-xl flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Request Try-On
          </button>
          <button
            onClick={handleWishlist}
            className="flex-1 h-12 sm:h-14 lg:h-16 border-2 border-blue-600 text-blue-600 text-sm sm:text-base lg:text-xl font-semibold rounded-lg sm:rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 active:scale-95 transition-all duration-200"
          >
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Add to Wishlist</span>
            <span className="sm:hidden">Wishlist</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

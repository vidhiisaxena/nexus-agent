// Mock session data for kiosk app
export const mockSession = {
  userId: "user-123",
  parsedIntent: {
    occasion: "wedding",
    style: "formal",
    season: "summer",
    budget: 200,
  },
  tags: ["#Wedding", "#Formal", "#SummerWear"],
  recommendations: [
    {
      productId: "P001",
      name: "Linen Blend Formal Blazer",
      price: 89.99,
      imageUrl:
        "https://images.unsplash.com/photo-1594938298602-c6c676d2b346?w=600&h=600&fit=crop&q=80",
      inStock: true,
      stockCount: 12,
      aisle: "3B",
      explanation:
        "This blazer matches your formal style and is perfect for summer weddings",
    },
    {
      productId: "P002",
      name: "Classic Dress Shirt - White",
      price: 49.99,
      imageUrl:
        "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=600&fit=crop&q=80",
      inStock: true,
      stockCount: 8,
      aisle: "2A",
      explanation:
        "A timeless white shirt that complements any formal occasion",
    },
    {
      productId: "P003",
      name: "Slim Fit Dress Pants - Navy",
      price: 79.99,
      imageUrl:
        "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=600&fit=crop&q=80",
      inStock: true,
      stockCount: 5,
      aisle: "2C",
      explanation:
        "These navy pants pair perfectly with the recommended blazer",
    },
    {
      productId: "P004",
      name: "Leather Oxford Shoes",
      price: 129.99,
      imageUrl:
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=600&fit=crop&q=80",
      inStock: false,
      stockCount: 0,
      aisle: "4A",
      explanation: "Classic oxfords to complete your formal look",
    },
  ],
};

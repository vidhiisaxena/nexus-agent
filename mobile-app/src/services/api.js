// Mock AI response data
export const mockAIResponse = {
  message:
    "I found some great formal options for your wedding! Here are my top picks:",
  intent: {
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
        "https://images.unsplash.com/photo-1594938298602-c6c676d2b346?w=400&h=400&fit=crop&q=80",
      inStock: true,
      aisle: "3B",
    },
    {
      productId: "P002",
      name: "Classic Dress Shirt - White",
      price: 49.99,
      imageUrl:
        "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop&q=80",
      inStock: true,
      aisle: "2A",
    },
  ],
};

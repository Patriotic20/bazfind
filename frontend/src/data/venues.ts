export interface Venue {
  id: string;
  name: string;
  location: string;
  capacity: string;
  capacityNum: number;
  priceText: string;
  priceNum: number;
  rating: number;
  category: "toyxona" | "restoran" | "katering" | "bezaklar";
  emoji: string;
  imageUrl?: string;
  tags: string[];
}

export const MOCK_VENUES: Venue[] = [
  {
    id: "1",
    name: "Oltin Saroy To'yxonasi",
    location: "Toshkent sh., Yunusobod",
    capacity: "500 kishi",
    capacityNum: 500,
    priceText: "12,000,000 UZS dan",
    priceNum: 12,
    rating: 4.9,
    category: "toyxona",
    emoji: "🏰",
    imageUrl: "/images/oltin_saroy.png",
    tags: ["Avtoturargoh", "Sahna", "Chiroqlar shousi"],
  },
  {
    id: "2",
    name: "Versal Tantanalar Zali",
    location: "Toshkent sh., Chilonzor",
    capacity: "400 kishi",
    capacityNum: 400,
    priceText: "15,000,000 UZS dan",
    priceNum: 15,
    rating: 4.8,
    category: "toyxona",
    emoji: "🌟",
    imageUrl: "/images/versal_hall.png",
    tags: ["Premium", "Konditsioner", "Ovoz tizimi"],
  },
  {
    id: "3",
    name: "Shoroq Restorani",
    location: "Toshkent sh., Mirobod",
    capacity: "150 kishi",
    capacityNum: 150,
    priceText: "4,000,000 UZS dan",
    priceNum: 4,
    rating: 4.7,
    category: "restoran",
    emoji: "🍽️",
    imageUrl: "/images/shoroq_restaurant.png",
    tags: ["Milliy & Yevropa", "Jonli ijro", "Shinam"],
  },
  {
    id: "4",
    name: "Lazzat Catering",
    location: "Toshkent sh., Yakkasaroy",
    capacity: "Cheksiz",
    capacityNum: 1000,
    priceText: "150,000 UZS / kishi",
    priceNum: 3,
    rating: 4.9,
    category: "katering",
    emoji: "🍢",
    imageUrl: "/images/party_hero.png",
    tags: ["Furshet", "Shirinliklar", "Professional xizmat"],
  },
  {
    id: "5",
    name: "Nafis Bezaklar Jamoasi",
    location: "Toshkent sh., Olmazor",
    capacity: "N/A",
    capacityNum: 0,
    priceText: "3,000,000 UZS dan",
    priceNum: 3,
    rating: 4.6,
    category: "bezaklar",
    emoji: "🎈",
    imageUrl: "/images/party_hero.png",
    tags: ["Geliy sharlar", "Gullar", "Fotozona"],
  },
  {
    id: "6",
    name: "Minor Milliy Taomlari",
    location: "Toshkent sh., Shayxontohur",
    capacity: "200 kishi",
    capacityNum: 200,
    priceText: "5,000,000 UZS dan",
    priceNum: 5,
    rating: 4.8,
    category: "restoran",
    emoji: "🥘",
    imageUrl: "/images/minor_restaurant.png",
    tags: ["Osh", "Milliy taomlar", "Oilaviy"],
  },
];

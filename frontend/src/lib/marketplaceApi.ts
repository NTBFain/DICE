export type ArtistService = {
  id: number;
  title: string;
  category: string;
  description: string;
  base_price: number;
  estimated_days: number;
  includes_commercial: boolean;
  includes_psd: boolean;
  sample_image_url?: string;
};

export type ArtistReview = {
  id: number;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type ArtistArtwork = {
  id: number;
  title: string;
  work_type: string;
  image_url: string;
  description?: string;
  character_name?: string;
};

export type ArtistAuction = {
  id: number;
  title: string;
  auction_type: 'ADOPTABLE' | 'COMMISSION_SLOT';
  starting_bid: number;
  bid_increment: number;
  auto_buy?: number;
  current_price: number;
  status: 'ACTIVE' | 'ENDED';
  end_time: string;
  image_url?: string;
};

export type ArtistCharacter = {
  id: number;
  name: string;
  tagline: string;
  description: string;
  theme_color: string;
  image_url?: string;
};

export type ArtistProfile = {
  id: number;
  user_id?: number;
  handle: string;
  display_name: string;
  tagline: string;
  bio: string;
  avatar_url?: string;
  banner_url?: string;
  styles: string[];
  commission_status: 'OPEN' | 'CLOSED' | 'WAITLIST';
  rating: number;
  total_completed_orders: number;
  starting_price: number;
  social_twitter?: string;
  social_pixiv?: string;
  social_discord?: string;
  is_verified: boolean;
  is_featured: boolean;
  services?: ArtistService[];
  reviews?: ArtistReview[];
  artworks?: ArtistArtwork[];
  auctions?: ArtistAuction[];
  characters?: ArtistCharacter[];
};

export const SAMPLE_ARTISTS_LIST: ArtistProfile[] = [
  {
    id: 1,
    handle: "kiriko_art",
    display_name: "Kiriko Studio (คิริโกะ)",
    tagline: "2D Live2D VTuber Models & Anime Character Design Specialist",
    bio: "สวัสดีครับ! ผมเป็นนักวาดสาย 2D Character Design & Live2D Rigging คุณภาพสูง ประสบการณ์กว่า 5 ปี รับวาดและทำโมเดล VTuber แบบครบวงจร ทั้งไฟล์ Layer PSD และไฟล์พร้อมเปิดใช้งานใน VTube Studio",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    banner_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    styles: ["VTuber 2D", "Character Sheet", "Anime Full Body"],
    commission_status: "OPEN",
    rating: 4.98,
    total_completed_orders: 48,
    starting_price: 1500.0,
    social_twitter: "@kiriko_art",
    social_pixiv: "kiriko_illust",
    is_verified: true,
    is_featured: true,
    services: [
      {
        id: 101,
        title: "Full Body Live2D Model Asset (Ready for Rigging)",
        category: "VTuber Model",
        description: "วาดโมเดล VTuber แบบตัดแยก Layer ละเอียด สำหรับนำไปส่งทำ Rigging (รวมไฟล์ PSD + 3 Expressions + สิทธิ์การพาณิชย์)",
        base_price: 6500.0,
        estimated_days: 14,
        includes_commercial: true,
        includes_psd: true,
        sample_image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: 102,
        title: "Character Concept Design Sheet (Front/Back/Expression)",
        category: "Concept Sheet",
        description: "ออกแบบตัวละครจากโจทย์ บรีฟข้อความ หรือภาพอ้างอิง พร้อมวาดด้านหน้า ด้านหลัง และตารางแสดงสีหน้า 4 แบบ",
        base_price: 3200.0,
        estimated_days: 7,
        includes_commercial: true,
        includes_psd: true,
        sample_image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80"
      }
    ],
    reviews: [
      {
        id: 201,
        client_name: "RikuVTuber_TH",
        rating: 5,
        comment: "งานลายเส้นสวยงามมาก ตัดเลเยอร์รายละเอียดเนี๊ยบ ริกเกอร์ชมเลยครับว่าทำงานง่ายมากๆ แนะนำเลยครับ!",
        created_at: "2026-07-15T14:30:00"
      },
      {
        id: 202,
        client_name: "NekoGuild_Official",
        rating: 5,
        comment: "ส่งงานตรงเวลา ใส่ใจในทุกดีเทลของชุดตัวละครที่สั่ง คุ้มค่ามากๆ ครับ",
        created_at: "2026-07-02T10:15:00"
      }
    ],
    artworks: [
      {
        id: 301,
        title: "Cyberpunk Cyber Samurai Girl",
        work_type: "VTuber 2D Asset",
        image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80",
        description: "ดีไซน์ตัวละครสาวซามูไรชุดเกราะไซเบอร์ ตัดแยกเลเยอร์พร้อมนำไป Rigging ใน VTube Studio",
        character_name: "Aoi (อาโออิ)"
      },
      {
        id: 302,
        title: "Sakura Shrine Maiden Concept Sheet",
        work_type: "Concept Sheet",
        image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
        description: "แผ่นคอนเซปต์ดีไซน์มิโกะศาลเจ้าสไตล์แฟนตาซี พร้อมรายละเอียดชุดและเครื่องประดับ",
        character_name: "Kiyomi (คิโยมิ)"
      }
    ],
    auctions: [
      {
        id: 401,
        title: "Adoptable Design #01: Cyber Kunoichi Asset",
        auction_type: "ADOPTABLE",
        starting_bid: 1500,
        bid_increment: 100,
        auto_buy: 4500,
        current_price: 2200,
        status: "ACTIVE",
        end_time: "2026-07-28T18:00:00",
        image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80"
      }
    ],
    characters: [
      {
        id: 501,
        name: "Aoi (อาโออิ)",
        tagline: "Cyberpunk Cyber Samurai",
        description: "ตัวละครหลักประจำ Kiriko Studio สาวซามูไรดาบแสงนีออนในเขตนครไซเบอร์",
        theme_color: "#3b82f6",
        image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80"
      },
      {
        id: 502,
        name: "Kiyomi (คิโยมิ)",
        tagline: "Sakura Shrine Maiden",
        description: "มิโกะศาลเจ้าดอกซากุระ ผู้ปกป้องภูติผีโบราณในป่าแห่งแสงจันทร์",
        theme_color: "#ec4899",
        image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80"
      }
    ]
  },
  {
    id: 2,
    handle: "cyber_chibi",
    display_name: "NekoChibi Workshop (เนโกะชิบิ)",
    tagline: "Cute Chibi Icons, Emotes & Discord Avatar Specialist",
    bio: "สายวาด Chibi น่ารักสดใส! รับทำ Twitch Emotes, Discord Badges, Chibi Full Body และลายเสื้อสินค้าพร้อมสิทธิ์พาณิชย์",
    avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
    banner_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
    styles: ["Chibi", "Discord Emotes", "Bust-Up Icon"],
    commission_status: "OPEN",
    rating: 5.0,
    total_completed_orders: 92,
    starting_price: 450.0,
    social_twitter: "@neko_chibi_art",
    is_verified: true,
    is_featured: true,
    services: [
      {
        id: 103,
        title: "Chibi Full Body Illustration",
        category: "Chibi",
        description: "วาดตัวละครสไตล์ Chibi ตัวจิ๋ว น่ารัก คมชัด ความละเอียด 3000x3000px 300DPI พร้อมฉากใส PNG",
        base_price: 850.0,
        estimated_days: 3,
        includes_commercial: true,
        includes_psd: false,
        sample_image_url: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80"
      }
    ],
    reviews: [
      {
        id: 203,
        client_name: "GamerCat99",
        rating: 5,
        comment: "วาดไวน่ารักมากๆ ครับ สั่งทำสติ๊กเกอร์ Discord 5 รูปวันเดียวได้เลย!",
        created_at: "2026-07-20T18:00:00"
      }
    ],
    artworks: [
      {
        id: 303,
        title: "Neko Gamer Girl Chibi Pack",
        work_type: "Chibi & Emotes",
        image_url: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80",
        description: "เซตตัวละครแมวเหมียวนักเกมเมอร์สุดน่ารัก สีสันสดใส",
        character_name: "Mimi (มิมี่)"
      }
    ],
    auctions: [
      {
        id: 402,
        title: "Chibi Adoptable #02: Neko Boba Maid",
        auction_type: "ADOPTABLE",
        starting_bid: 500,
        bid_increment: 50,
        auto_buy: 1500,
        current_price: 750,
        status: "ACTIVE",
        end_time: "2026-07-27T20:00:00",
        image_url: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80"
      }
    ],
    characters: [
      {
        id: 503,
        name: "Mimi (มิมี่)",
        tagline: "Gamer Neko Mascot",
        description: "มาสคอตแมวเหมียวนักสตรีมเมอร์สุดสดใสประจำ NekoChibi Workshop",
        theme_color: "#f472b6",
        image_url: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=400&q=80"
      }
    ]
  },
  {
    id: 3,
    handle: "aether_illust",
    display_name: "Aether Fantasy Art (เอเธอร์)",
    tagline: "Epic High-Density Background & Environment Illustration",
    bio: "เน้นงานวาดฉากหลังอลังการ สไตล์ Fantasy, Sci-Fi, และคีย์วิชวลสำหรับปกนิยาย เกมการ์ด และสื่อสิ่งพิมพ์คุณภาพสูง",
    avatar_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80",
    banner_url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80",
    styles: ["Environment", "Fantasy Cover", "Full Illustration"],
    commission_status: "WAITLIST",
    rating: 4.95,
    total_completed_orders: 31,
    starting_price: 3500.0,
    social_twitter: "@aether_art",
    is_verified: true,
    is_featured: false,
    services: [
      {
        id: 104,
        title: "Full Fantasy Cover Illustration & High-FX Environment",
        category: "Environment",
        description: "ภาพประกอบฉากอลังการ พร้อมเอฟเฟกต์แสงเงาและตัวละครหลัก เหมาะสำหรับปกนิยาย หรือโปสเตอร์สื่อสิ่งพิมพ์",
        base_price: 5500.0,
        estimated_days: 10,
        includes_commercial: true,
        includes_psd: true,
        sample_image_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80"
      }
    ],
    reviews: [],
    artworks: [
      {
        id: 304,
        title: "The Celestial Dragon Temple",
        work_type: "Environment",
        image_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
        description: "ภาพประกอบฉากวิหารมังกรบนยอดเขาสีทอง สไตล์แฟนตาซีมหาเวท"
      }
    ],
    auctions: [],
    characters: []
  }
];

const getBaseApiUrl = () => {
  if (typeof window !== 'undefined') return '/api';
  return 'http://127.0.0.1:8000/api';
};

export const getMarketplaceArtists = async (filters?: {
  query?: string;
  style?: string;
  status?: string;
  maxPrice?: number;
}): Promise<ArtistProfile[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.query) params.append('query', filters.query);
    if (filters?.style && filters.style !== 'ALL') params.append('style', filters.style);
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters?.maxPrice) params.append('max_price', filters.maxPrice.toString());

    const res = await fetch(`${getBaseApiUrl()}/artists?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('Failed to fetch artists from API:', e);
  }
  return [];
};

export const getArtistByHandle = async (handle: string): Promise<ArtistProfile | null> => {
  try {
    const res = await fetch(`${getBaseApiUrl()}/artists/${handle}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('Failed to fetch artist by handle:', e);
  }
  return null;
};

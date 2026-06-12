export type VisibleWardrobeItem = {
  id: string;
  owner: string;
  photo_url: string;
  thumbnail_url: string | null;
  label: string | null;
  tags: string[];
  added_at: string | null;
  archived: boolean;
  wear_count: number;
  last_worn_at: string | null;
  photo_signed_url: string | null;
  thumbnail_signed_url: string | null;
};

export type OutfitSuggestion = {
  id: string;
  date_id: string | null;
  suggester: string;
  target_user: string;
  wardrobe_item: string;
  note: string | null;
  status: "pending" | "accepted" | "counter" | "declined";
  counter_item: string | null;
  responded_at: string | null;
  created_at: string | null;
};

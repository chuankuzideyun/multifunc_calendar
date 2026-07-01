export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  source: 'gmail' | 'weather' | 'voice' | 'manual';
  status: 'pending' | 'confirmed' | 'rejected';
  confidence: number | null;
}

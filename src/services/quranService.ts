export interface Surah {
  id: number;
  name: string;
  makkia: number;
  type: number;
}

export interface Reciter {
  id: number;
  name: string;
  server: string;
  surah_list: string;
}

const API_BASE = 'https://www.mp3quran.net/api/v3';

export const quranService = {
  async getSuwar(): Promise<Surah[]> {
    const response = await fetch(`${API_BASE}/suwar?language=ar`);
    const data = await response.json();
    return data.suwar;
  },

  async getReciters(ids: number[]): Promise<Reciter[]> {
    const response = await fetch(`${API_BASE}/reciters?language=ar&reciter=${ids.join(',')}`);
    const data = await response.json();
    return data.reciters.map((reciter: any) => ({
      id: reciter.id,
      name: reciter.name,
      server: reciter.moshaf[0].server,
      surah_list: reciter.moshaf[0].surah_list,
    }));
  },

  async getNasserAlQatami(): Promise<Reciter> {
    const reciters = await this.getReciters([86]);
    return reciters[0];
  },

  getAudioUrl(server: string, surahId: number): string {
    const formattedId = surahId.toString().padStart(3, '0');
    const baseUrl = server.endsWith('/') ? server : `${server}/`;
    return `${baseUrl}${formattedId}.mp3`;
  }
};

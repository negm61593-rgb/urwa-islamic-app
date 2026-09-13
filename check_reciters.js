
import fetch from 'node-fetch';

async function checkReciters() {
  const ids = [67, 3, 164]; // Nasser Al-Qatami, Abdul Rahman Al-Sudais, Islam Sobhi
  const response = await fetch(`https://www.mp3quran.net/api/v3/reciters?language=eng&reciter=${ids.join(',')}`);
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

checkReciters();

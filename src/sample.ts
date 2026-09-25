import type { Look } from './look'

export type SampleTrip = {
  id:
    | 'caribbean'
    | 'europe'
    | 'nashville'
    | 'appalachian'
    | 'asia'
    | 'silkroad'
    | 'oregon'
    | 'roadtrip'
    | 'camino'
    | 'transsiberian'
    | 'grandtour'
    | 'appian'
  title: string
  blurb: string
  filename: string
  csv: string
  look?: Partial<Look>
}

export const SAMPLE_TRIPS: SampleTrip[] = [
  {
    id: 'caribbean',
    title: 'Caribbean Cruise',
    blurb: 'Eastern Caribbean Experience',
    filename: 'caribbean-cruise.csv',
    look: {
      followRoads: false,
      map: 'satellite',
      path: 'dashed',
      pathColor: '#f3e6c4',
      pinColor: '#f3e6c4',
    },
    csv: `title,date,place,lat,lng,notes,photo
Home port,2025-01-12,Miami FL,25.7795,-80.1709,PortMiami,https://picsum.photos/seed/mm-miami/640/480
Nassau,2025-01-14,Nassau Bahamas,25.0774,-77.3413,Prince George Wharf,https://picsum.photos/seed/mm-nassau/640/480
San Juan,2025-01-16,San Juan Puerto Rico,18.4603,-66.1097,Old San Juan piers,https://picsum.photos/seed/mm-sanjuan/640/480
St. Thomas,2025-01-17,Charlotte Amalie USVI,18.3358,-64.9228,Havensight harbor,https://picsum.photos/seed/mm-stthomas/640/480
St. Maarten,2025-01-18,Philipsburg St Maarten,18.0116,-63.0472,Great Bay,https://picsum.photos/seed/mm-stmaarten/640/480
Barbados,2025-01-19,Bridgetown Barbados,13.0980,-59.6320,Careenage,https://picsum.photos/seed/mm-barbados/640/480
`,
  },
  {
    id: 'europe',
    title: 'European Rail Vacation',
    blurb: 'Capitals by train, Paris to Prague.',
    filename: 'european-train.csv',
    csv: `title,date,place,lat,lng,notes
Paris,2025-06-02,Paris France,48.8566,2.3522,Gare du Nord
Brussels,2025-06-04,Brussels Belgium,,,Grand-Place
Amsterdam,2025-06-06,Amsterdam Netherlands,52.3676,4.9041,Centraal
Cologne,2025-06-08,Cologne Germany,,,Cathedral
Berlin,2025-06-10,Berlin Germany,52.52,13.405,Hauptbahnhof
Prague,2025-06-12,Prague Czechia,,,Old Town
`,
  },
  {
    id: 'nashville',
    title: 'L.A. To Nashville',
    blurb: 'American Interstate Adventure',
    filename: 'la-to-nashville.csv',
    csv: `title,date,place,lat,lng,notes
Los Angeles,2025-09-01,Los Angeles CA,34.0522,-118.2437,Start west
Las Vegas,2025-09-02,Las Vegas NV,36.1699,-115.1398,Overnight
Santa Fe,2025-09-04,Santa Fe NM,35.687,-105.9378,High desert
Oklahoma City,2025-09-06,Oklahoma City OK,35.4676,-97.5164,I-40
Nashville,2025-09-08,Nashville TN,36.1627,-86.7816,Music City
`,
  },
  {
    id: 'appalachian',
    title: 'Appalachian Trail Hike',
    blurb: 'Springer Mountain to Max Patch',
    filename: 'appalachian-trail.csv',
    look: { followRoads: false, map: 'terrain' },
    csv: `title,date,place,lat,lng,notes
Springer Mountain,2025-04-01,Springer Mountain GA,34.6268,-84.1938,Southern terminus
Neels Gap,2025-04-04,Neels Gap GA,34.7350,-83.9250,Walasi-Yi
Dicks Creek Gap,2025-04-08,Dicks Creek Gap GA,34.9115,-83.6182,US 76
Fontana Dam,2025-04-14,Fontana Dam NC,35.4523,-83.8049,Into the Smokies
Newfound Gap,2025-04-18,Newfound Gap TN,35.6112,-83.4250,US 441
Max Patch,2025-04-21,Max Patch NC,35.7970,-82.9568,Bald with a view
`,
  },
  {
    id: 'asia',
    title: 'Historic Landmarks of Asia',
    blurb: 'Travel Across Time',
    filename: 'asia-landmarks.csv',
    look: { followRoads: false },
    csv: `title,date,place,lat,lng,notes
Taj Mahal,2025-10-03,Agra India,27.1751,78.0421,Marble mausoleum
Angkor Wat,2025-10-07,Siem Reap Cambodia,13.4125,103.8667,Khmer temple city
Borobudur,2025-10-10,Magelang Indonesia,-7.6079,110.2038,Buddhist monument
Great Wall,2025-10-14,Mutianyu China,40.4310,116.5704,Ming dynasty wall
Gyeongbokgung,2025-10-17,Seoul South Korea,37.5796,126.9770,Joseon palace
Kiyomizu-dera,2025-10-20,Kyoto Japan,34.9949,135.7850,Wooden temple
`,
  },
  {
    id: 'silkroad',
    title: 'Silk Road Caravan',
    blurb: "Xi'an to Constantinople, 1271–1272",
    filename: 'silk-road-caravan.csv',
    look: { followRoads: false, map: 'terrain' },
    csv: `title,date,place,lat,lng,notes
Xi'an (Chang'an),1271-04-12,"Xi'an (Chang'an), China",34.3416,108.9398,
Dunhuang,1271-06-03,"Dunhuang, China",40.1421,94.6618,
Kashgar,1271-08-21,"Kashgar, China",39.4704,75.9898,
Samarkand,1271-10-09,"Samarkand, Uzbekistan",39.6270,66.9750,
Bukhara,1271-11-28,"Bukhara, Uzbekistan",39.7681,64.4556,
Baghdad,1272-02-14,"Baghdad, Iraq",33.3152,44.3661,
Constantinople,1272-04-02,"Constantinople (Istanbul), Turkey",41.0082,28.9784,
`,
  },
  {
    id: 'oregon',
    title: 'Oregon Trail',
    blurb: 'Independence to Oregon City, 1847',
    filename: 'oregon-trail.csv',
    look: { followRoads: false, map: 'terrain' },
    csv: `title,date,place,lat,lng,notes
Independence,1847-05-01,"Independence, Missouri",39.0911,-94.4155,
Fort Kearny,1847-05-28,"Fort Kearny, Nebraska",40.6433,-99.0065,
Fort Laramie,1847-06-22,"Fort Laramie, Wyoming",42.2125,-104.5175,
South Pass,1847-08-12,"South Pass, Wyoming",42.3422,-108.9050,
Fort Hall,1847-09-18,"Fort Hall, Idaho",43.0330,-112.4300,
Oregon City,1847-10-25,"Oregon City, Oregon",45.3573,-122.6068,
`,
  },
  {
    id: 'roadtrip',
    title: 'Classic Road Trip',
    blurb: 'Chicago to Santa Monica, 1955',
    filename: 'classic-road-trip.csv',
    look: { followRoads: true, map: 'streets' },
    csv: `title,date,place,lat,lng,notes
Chicago,1955-06-10,"Chicago, Illinois",41.8781,-87.6298,
St. Louis,1955-06-14,"St. Louis, Missouri",38.6270,-90.1994,
Tulsa,1955-06-18,"Tulsa, Oklahoma",36.1540,-95.9928,
Amarillo,1955-06-21,"Amarillo, Texas",35.2220,-101.8313,
Albuquerque,1955-06-24,"Albuquerque, New Mexico",35.0844,-106.6504,
Flagstaff,1955-06-27,"Flagstaff, Arizona",35.1983,-111.6513,
Santa Monica,1955-06-30,"Santa Monica, California",34.0195,-118.4912,
`,
  },
  {
    id: 'camino',
    title: 'Camino Francés',
    blurb: 'Saint-Jean-Pied-de-Port to Santiago, 2019',
    filename: 'camino-frances.csv',
    look: { followRoads: false, map: 'terrain' },
    csv: `title,date,place,lat,lng,notes
Saint-Jean-Pied-de-Port,2019-05-01,"Saint-Jean-Pied-de-Port, France",43.1633,-1.2378,
Pamplona,2019-05-05,"Pamplona, Spain",42.8125,-1.6458,
Logroño,2019-05-12,"Logroño, Spain",42.4627,-2.4449,
Burgos,2019-05-18,"Burgos, Spain",42.3439,-3.6969,
León,2019-05-25,"León, Spain",42.5987,-5.5671,
Ponferrada,2019-06-01,"Ponferrada, Spain",42.5461,-6.5962,
Santiago de Compostela,2019-06-08,"Santiago de Compostela, Spain",42.8782,-8.5448,
`,
  },
  {
    id: 'transsiberian',
    title: 'Trans-Siberian Railway',
    blurb: 'Moscow to Vladivostok, 1910',
    filename: 'trans-siberian.csv',
    look: { followRoads: false, map: 'paper' },
    csv: `title,date,place,lat,lng,notes
Moscow,1910-07-01,"Moscow, Russia",55.7558,37.6173,
Yekaterinburg,1910-07-03,"Yekaterinburg, Russia",56.8389,60.6057,
Novosibirsk,1910-07-06,"Novosibirsk, Russia",55.0084,82.9357,
Krasnoyarsk,1910-07-09,"Krasnoyarsk, Russia",56.0153,92.8932,
Irkutsk,1910-07-12,"Irkutsk, Russia",52.2869,104.3050,
Khabarovsk,1910-07-16,"Khabarovsk, Russia",48.4827,135.0838,
Vladivostok,1910-07-18,"Vladivostok, Russia",43.1198,131.8869,
`,
  },
  {
    id: 'grandtour',
    title: 'Grand Tour of Europe',
    blurb: 'London to Venice, 1788',
    filename: 'grand-tour-europe.csv',
    look: { followRoads: false, map: 'paper' },
    csv: `title,date,place,lat,lng,notes
London,1788-03-15,"London, England",51.5074,-0.1278,
Paris,1788-04-02,"Paris, France",48.8566,2.3522,
Geneva,1788-05-20,"Geneva, Switzerland",46.2044,6.1432,
Florence,1788-06-18,"Florence, Italy",43.7696,11.2558,
Rome,1788-08-01,"Rome, Italy",41.9028,12.4964,
Naples,1788-09-25,"Naples, Italy",40.8518,14.2681,
Venice,1788-11-10,"Venice, Italy",45.4408,12.3155,
`,
  },
  {
    id: 'appian',
    title: 'Appian Way Journey',
    blurb: 'Rome to Brindisi, AD 120',
    filename: 'appian-way.csv',
    look: { followRoads: false, map: 'terrain' },
    csv: `title,date,place,lat,lng,notes
Rome,0120-03-10,"Rome, Italy",41.9028,12.4964,
Albano Laziale,0120-03-11,"Albano Laziale / Alban Hills, Italy",41.7275,12.6611,
Terracina,0120-03-13,"Terracina, Italy",41.2917,13.2486,
Capua,0120-03-15,"Capua, Italy",41.1050,14.2125,
Benevento,0120-03-17,"Benevento, Italy",41.1297,14.7826,
Taranto,0120-03-20,"Taranto, Italy",40.4644,17.2470,
Brindisi,0120-03-22,"Brindisi, Italy",40.6322,17.9432,
`,
  },
]

import type { Look } from './look'

export type SampleTrip = {
  id: 'caribbean' | 'europe' | 'nashville' | 'appalachian' | 'asia'
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
    blurb: 'Eastern Caribbean ports, plotted over the water.',
    filename: 'caribbean-cruise.csv',
    look: {
      followRoads: false,
      map: 'satellite',
      path: 'dashed',
      pathColor: '#f3e6c4',
      pinColor: '#f3e6c4',
    },
    csv: `title,date,place,lat,lng,notes
Home port,2025-01-12,Miami FL,25.7795,-80.1709,PortMiami
Nassau,2025-01-14,Nassau Bahamas,25.0774,-77.3413,Prince George Wharf
San Juan,2025-01-16,San Juan Puerto Rico,18.4603,-66.1097,Old San Juan piers
St. Thomas,2025-01-17,Charlotte Amalie USVI,18.3358,-64.9228,Havensight harbor
St. Maarten,2025-01-18,Philipsburg St Maarten,18.0116,-63.0472,Great Bay
Barbados,2025-01-19,Bridgetown Barbados,13.0980,-59.6320,Careenage
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
    title: 'L.A. to Nashville Road Trip',
    blurb: 'West to Music City on the interstate.',
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
    title: 'Appalachian Trail Section Hike',
    blurb: 'Springer Mountain to Max Patch: six AT waypoints.',
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
    blurb: 'Six landmarks from India to Japan.',
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
]

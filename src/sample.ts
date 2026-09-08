export type SampleTrip = {
  id: 'caribbean' | 'europe' | 'nashville'
  title: string
  filename: string
  csv: string
}

export const SAMPLE_TRIPS: SampleTrip[] = [
  {
    id: 'caribbean',
    title: 'Caribbean Cruise',
    filename: 'caribbean-cruise.csv',
    csv: `title,date,place,lat,lng,notes
Home port,2025-01-12,Miami FL,25.7617,-80.1918,Embarkation day
Nassau,2025-01-13,Nassau Bahamas,,,Straw Market
Cozumel,2025-01-15,Cozumel Mexico,,,Mayan coast
Grand Cayman,2025-01-16,George Town Cayman Islands,,,Seven Mile Beach
Falmouth,2025-01-17,Falmouth Jamaica,,,North coast
`,
  },
  {
    id: 'europe',
    title: 'European Rail Vacation',
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
    filename: 'la-to-nashville.csv',
    csv: `title,date,place,lat,lng,notes
Los Angeles,2025-09-01,Los Angeles CA,34.0522,-118.2437,Start west
Las Vegas,2025-09-02,Las Vegas NV,36.1699,-115.1398,Overnight
Santa Fe,2025-09-04,Santa Fe NM,35.687,-105.9378,High desert
Oklahoma City,2025-09-06,Oklahoma City OK,35.4676,-97.5164,I-40
Nashville,2025-09-08,Nashville TN,36.1627,-86.7816,Music City
`,
  },
]

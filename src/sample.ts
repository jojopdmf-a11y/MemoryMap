import type { Look } from './look'

export type SampleTrip = {
  id:
    | 'toystory'
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
    id: 'toystory',
    title: 'Disney On Ice: Toy Story',
    blurb: 'USA & Canada tour, 2000–01',
    filename: 'disney-toy-story-usa.csv',
    look: {
      followRoads: true,
      map: 'streets',
      path: 'solid',
      pathColor: '#c4844a',
      pinColor: '#c4844a',
    },
    csv: `title,date,place,lat,lng,notes,photo
Rosemont,2000-09-27,"Rosemont, IL, USA",41.9941,-87.8757,Disney On Ice · Toy Story,
Chicago,2000-10-03,"Chicago, IL, USA",41.8756,-87.6244,Disney On Ice · Toy Story,https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/Skyline_de_Chicago_desde_el_centro%2C_Illinois%2C_Estados_Unidos%2C_2012-10-20%2C_DD_06.jpg/960px-Skyline_de_Chicago_desde_el_centro%2C_Illinois%2C_Estados_Unidos%2C_2012-10-20%2C_DD_06.jpg
Tucson,2000-10-10,"Tucson, AZ, USA",32.2229,-110.9748,Disney On Ice · Toy Story,
El Paso,2000-10-16,"El Paso, TX, USA",31.7601,-106.4870,Disney On Ice · Toy Story,
Bakersfield,2000-10-23,"Bakersfield, CA, USA",35.3739,-119.0195,Disney On Ice · Toy Story,
Sacramento,2000-10-30,"Sacramento, CA, USA",38.5811,-121.4939,Disney On Ice · Toy Story,
San Jose,2000-11-06,"San Jose, CA, USA",37.3362,-121.8906,Disney On Ice · Toy Story,
Oakland,2000-11-13,"Oakland, CA, USA",37.8045,-122.2714,Disney On Ice · Toy Story,
San Francisco,2000-11-20,"San Francisco, CA, USA",37.7879,-122.4075,Disney On Ice · Toy Story,https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/GoldenGateBridge.jpg/960px-GoldenGateBridge.jpg
Salt Lake City,2000-11-27,"Salt Lake City, UT, USA",40.7596,-111.8868,Disney On Ice · Toy Story,
Rockford,2000-12-04,"Rockford, IL, USA",42.2714,-89.0940,Disney On Ice · Toy Story,
Madison,2000-12-11,"Madison, WI, USA",43.0747,-89.3842,Disney On Ice · Toy Story,
Toronto,2000-12-18,"Toronto, Ontario, Canada",43.6535,-79.3839,Disney On Ice · Toy Story,https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/CN_Tower_Toronto.jpg/960px-CN_Tower_Toronto.jpg
Buffalo,2001-01-08,"Buffalo, NY, USA",42.8864,-78.8781,Disney On Ice · Toy Story,
New Haven,2001-01-15,"New Haven, CT, USA",41.3082,-72.9251,Disney On Ice · Toy Story,
Binghamton,2001-01-22,"Binghamton, NY, USA",42.0987,-75.9125,Disney On Ice · Toy Story,
Green Bay,2001-01-29,"Green Bay, WI, USA",44.5126,-88.0126,Disney On Ice · Toy Story,
Winnipeg,2001-02-05,"Winnipeg, Manitoba, Canada",49.8955,-97.1385,Disney On Ice · Toy Story,
Calgary,2001-02-12,"Calgary, Alberta, Canada",51.0456,-114.0575,Disney On Ice · Toy Story,
Edmonton,2001-02-19,"Edmonton, Alberta, Canada",53.5462,-113.4912,Disney On Ice · Toy Story,
Seattle,2001-02-26,"Seattle, WA, USA",47.6038,-122.3301,Disney On Ice · Toy Story,https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Seattle_from_Space_Needle_June_2018_003.jpg/960px-Seattle_from_Space_Needle_June_2018_003.jpg
Kennewick,2001-03-05,"Kennewick, WA, USA",46.2087,-119.1199,Disney On Ice · Toy Story,
Billings,2001-03-12,"Billings, MT, USA",45.7875,-108.4961,Disney On Ice · Toy Story,
Colorado Springs,2001-03-19,"Colorado Springs, CO, USA",38.8340,-104.8253,Disney On Ice · Toy Story,
Denver,2001-03-26,"Denver, CO, USA",39.7392,-104.9849,Disney On Ice · Toy Story,https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/Full_Denver_skyline.jpg/960px-Full_Denver_skyline.jpg
Kansas City,2001-04-02,"Kansas City, MO, USA",39.1001,-94.5781,Disney On Ice · Toy Story,
Grand Rapids,2001-04-09,"Grand Rapids, MI, USA",42.9632,-85.6679,Disney On Ice · Toy Story,
Fort Wayne,2001-04-15,"Fort Wayne, IN, USA",41.0800,-85.1386,Disney On Ice · Toy Story,
Augusta,2001-04-23,"Augusta, GA, USA",33.4710,-81.9748,Disney On Ice · Toy Story,
`,
  },
  {
    id: 'europe',
    title: 'European Rail Vacation',
    blurb: 'Capitals by train, Paris to Prague.',
    filename: 'european-train.csv',
    csv: `title,date,place,lat,lng,notes,photo
Paris,2025-06-02,Paris France,48.8566,2.3522,Gare du Nord,https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Eiffel_Tower_from_the_Tour_Montparnasse_3%2C_Paris_May_2014.jpg/960px-Eiffel_Tower_from_the_Tour_Montparnasse_3%2C_Paris_May_2014.jpg
Brussels,2025-06-04,Brussels Belgium,,,Grand-Place,https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Grand_Place_Brussels.JPG/960px-Grand_Place_Brussels.JPG
Amsterdam,2025-06-06,Amsterdam Netherlands,52.3676,4.9041,Centraal,https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Amsterdam_Canals_-_July_2006.jpg/960px-Amsterdam_Canals_-_July_2006.jpg
Cologne,2025-06-08,Cologne Germany,,,Cathedral,https://upload.wikimedia.org/wikipedia/commons/f/fe/Cologne_Cathedral.jpg
Berlin,2025-06-10,Berlin Germany,52.52,13.405,Hauptbahnhof,https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Brandenburger_Tor_abends.jpg/960px-Brandenburger_Tor_abends.jpg
Prague,2025-06-12,Prague Czechia,,,Old Town,https://thumb.wikimedia.org/wikipedia/commons/thumb/4/44/Prague_07-2016_View_from_Old_Town_Hall_Tower_img3.jpg/960px-Prague_07-2016_View_from_Old_Town_Hall_Tower_img3.jpg
`,
  },
  {
    id: 'nashville',
    title: 'L.A. To Nashville',
    blurb: 'American Interstate Adventure',
    filename: 'la-to-nashville.csv',
    csv: `title,date,place,lat,lng,notes,photo
Los Angeles,2025-09-01,Los Angeles CA,34.0522,-118.2437,Start west,https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/LA_Skyline_Mountains2.jpg/960px-LA_Skyline_Mountains2.jpg
Las Vegas,2025-09-02,Las Vegas NV,36.1699,-115.1398,Overnight,https://upload.wikimedia.org/wikipedia/commons/a/a7/Las_Vegas_Strip_at_night.jpg
Santa Fe,2025-09-04,Santa Fe NM,35.687,-105.9378,High desert,https://thumb.wikimedia.org/wikipedia/commons/thumb/4/44/Santa_Fe_Plaza.jpg/960px-Santa_Fe_Plaza.jpg
Oklahoma City,2025-09-06,Oklahoma City OK,35.4676,-97.5164,I-40,
Nashville,2025-09-08,Nashville TN,36.1627,-86.7816,Music City,https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Nashville_skyline_2009.jpg/960px-Nashville_skyline_2009.jpg
`,
  },
  {
    id: 'appalachian',
    title: 'Appalachian Trail Hike',
    blurb: 'Springer Mountain to Max Patch',
    filename: 'appalachian-trail.csv',
    look: { followRoads: false, map: 'terrain' },
    csv: `title,date,place,lat,lng,notes,photo
Springer Mountain,2025-04-01,Springer Mountain GA,34.6268,-84.1938,Southern terminus,https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Springer_Mountain_-_Appalachian_approach_trail_%2822189080221%29.jpg/960px-Springer_Mountain_-_Appalachian_approach_trail_%2822189080221%29.jpg
Neels Gap,2025-04-04,Neels Gap GA,34.7350,-83.9250,Walasi-Yi,
Dicks Creek Gap,2025-04-08,Dicks Creek Gap GA,34.9115,-83.6182,US 76,
Fontana Dam,2025-04-14,Fontana Dam NC,35.4523,-83.8049,Into the Smokies,https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Fontana_Dam.jpg/960px-Fontana_Dam.jpg
Newfound Gap,2025-04-18,Newfound Gap TN,35.6112,-83.4250,US 441,https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Newfound_Gap_-_October_2023_-_Sarah_Stierch_01.jpg/960px-Newfound_Gap_-_October_2023_-_Sarah_Stierch_01.jpg
Max Patch,2025-04-21,Max Patch NC,35.7970,-82.9568,Bald with a view,https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Appalachian_Trail_crosses_the_grassy_bald_area_atop_Max_Patch_Mountain.jpg/960px-Appalachian_Trail_crosses_the_grassy_bald_area_atop_Max_Patch_Mountain.jpg
`,
  },
  {
    id: 'asia',
    title: 'Historic Landmarks of Asia',
    blurb: 'Travel Across Time',
    filename: 'asia-landmarks.csv',
    look: { followRoads: false },
    csv: `title,date,place,lat,lng,notes,photo
Taj Mahal,2025-10-03,Agra India,27.1751,78.0421,Marble mausoleum,https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/960px-Taj_Mahal_%28Edited%29.jpeg
Angkor Wat,2025-10-07,Siem Reap Cambodia,13.4125,103.8667,Khmer temple city,https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Angkor_Wat.jpg/960px-Angkor_Wat.jpg
Borobudur,2025-10-10,Magelang Indonesia,-7.6079,110.2038,Buddhist monument,https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/Borobudur_temple.jpg/960px-Borobudur_temple.jpg
Great Wall,2025-10-14,Mutianyu China,40.4310,116.5704,Ming dynasty wall,https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Great_Wall_of_China_July_2006.JPG/960px-Great_Wall_of_China_July_2006.JPG
Gyeongbokgung,2025-10-17,Seoul South Korea,37.5796,126.9770,Joseon palace,https://upload.wikimedia.org/wikipedia/commons/c/cc/Geunjeongjeon.jpg
Kiyomizu-dera,2025-10-20,Kyoto Japan,34.9949,135.7850,Wooden temple,https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Kiyomizu-dera_in_Kyoto-r.jpg/960px-Kiyomizu-dera_in_Kyoto-r.jpg
`,
  },
  {
    id: 'silkroad',
    title: 'Silk Road Caravan',
    blurb: "Xi'an to Constantinople, 1271–1272",
    filename: 'silk-road-caravan.csv',
    look: { followRoads: false, map: 'terrain' },
    csv: `title,date,place,lat,lng,notes,photo
Xi'an (Chang'an),1271-04-12,"Xi'an (Chang'an), China",34.3416,108.9398,,https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Terracotta_Army%2C_View_of_Pit_1.jpg/960px-Terracotta_Army%2C_View_of_Pit_1.jpg
Dunhuang,1271-06-03,"Dunhuang, China",40.1421,94.6618,,https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Mogao_Caves.jpg/960px-Mogao_Caves.jpg
Kashgar,1271-08-21,"Kashgar, China",39.4704,75.9898,,
Samarkand,1271-10-09,"Samarkand, Uzbekistan",39.6270,66.9750,,https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Registan_Samarkand_Uzbekistan.JPG/960px-Registan_Samarkand_Uzbekistan.JPG
Bukhara,1271-11-28,"Bukhara, Uzbekistan",39.7681,64.4556,,https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Po-i-Kalyan_in_Bukhara_02.jpg/960px-Po-i-Kalyan_in_Bukhara_02.jpg
Baghdad,1272-02-14,"Baghdad, Iraq",33.3152,44.3661,,
Constantinople,1272-04-02,"Constantinople (Istanbul), Turkey",41.0082,28.9784,,https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Hagia_Sophia_Mars_2013.jpg/960px-Hagia_Sophia_Mars_2013.jpg
`,
  },
  {
    id: 'oregon',
    title: 'Oregon Trail',
    blurb: 'Independence to Oregon City, 1847',
    filename: 'oregon-trail.csv',
    look: { followRoads: false, map: 'terrain' },
    csv: `title,date,place,lat,lng,notes,photo
Independence,1847-05-01,"Independence, Missouri",39.0911,-94.4155,,https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Jackson_County_Courthouse_Independence_MO-cropped.jpg/960px-Jackson_County_Courthouse_Independence_MO-cropped.jpg
Fort Kearny,1847-05-28,"Fort Kearny, Nebraska",40.6433,-99.0065,,
Fort Laramie,1847-06-22,"Fort Laramie, Wyoming",42.2125,-104.5175,,https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Fort_Laramie_NHS_WY3.jpg/960px-Fort_Laramie_NHS_WY3.jpg
South Pass,1847-08-12,"South Pass, Wyoming",42.3422,-108.9050,,https://upload.wikimedia.org/wikipedia/commons/9/97/DSCN6109_pacificspringsandsouthpass_e_600.jpg
Fort Hall,1847-09-18,"Fort Hall, Idaho",43.0330,-112.4300,,
Oregon City,1847-10-25,"Oregon City, Oregon",45.3573,-122.6068,,https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Oregon_City_Municipal_Elevator.jpg/960px-Oregon_City_Municipal_Elevator.jpg
`,
  },
  {
    id: 'roadtrip',
    title: 'Classic Road Trip',
    blurb: 'Chicago to Santa Monica, 1955',
    filename: 'classic-road-trip.csv',
    look: { followRoads: true, map: 'streets' },
    csv: `title,date,place,lat,lng,notes,photo
Chicago,1955-06-10,"Chicago, Illinois",41.8781,-87.6298,,https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/Skyline_de_Chicago_desde_el_centro%2C_Illinois%2C_Estados_Unidos%2C_2012-10-20%2C_DD_06.jpg/960px-Skyline_de_Chicago_desde_el_centro%2C_Illinois%2C_Estados_Unidos%2C_2012-10-20%2C_DD_06.jpg
St. Louis,1955-06-14,"St. Louis, Missouri",38.6270,-90.1994,,https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Gateway_Arch_St_Louis.jpg/960px-Gateway_Arch_St_Louis.jpg
Tulsa,1955-06-18,"Tulsa, Oklahoma",36.1540,-95.9928,,
Amarillo,1955-06-21,"Amarillo, Texas",35.2220,-101.8313,,https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Cadillac_Ranch.jpg/960px-Cadillac_Ranch.jpg
Albuquerque,1955-06-24,"Albuquerque, New Mexico",35.0844,-106.6504,,
Flagstaff,1955-06-27,"Flagstaff, Arizona",35.1983,-111.6513,,https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Flagstaff-Flagstaff_3rd_Post_Office_Building-1917.jpg/960px-Flagstaff-Flagstaff_3rd_Post_Office_Building-1917.jpg
Santa Monica,1955-06-30,"Santa Monica, California",34.0195,-118.4912,,https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/Santa_Monica_Pier.jpg/960px-Santa_Monica_Pier.jpg
`,
  },
  {
    id: 'camino',
    title: 'Camino Francés',
    blurb: 'Saint-Jean-Pied-de-Port to Santiago, 2019',
    filename: 'camino-frances.csv',
    look: { followRoads: false, map: 'terrain' },
    csv: `title,date,place,lat,lng,notes,photo
Saint-Jean-Pied-de-Port,2019-05-01,"Saint-Jean-Pied-de-Port, France",43.1633,-1.2378,,https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Saint-Jean-Pied-de-Port.jpg/960px-Saint-Jean-Pied-de-Port.jpg
Pamplona,2019-05-05,"Pamplona, Spain",42.8125,-1.6458,,https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Ayuntamiento_in_Pamplona_Spain.jpg/960px-Ayuntamiento_in_Pamplona_Spain.jpg
Logroño,2019-05-12,"Logroño, Spain",42.4627,-2.4449,,
Burgos,2019-05-18,"Burgos, Spain",42.3439,-3.6969,,https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Catedral_de_Burgos.jpg/960px-Catedral_de_Burgos.jpg
León,2019-05-25,"León, Spain",42.5987,-5.5671,,https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Catedral_de_Le%C3%B3n.jpg/960px-Catedral_de_Le%C3%B3n.jpg
Ponferrada,2019-06-01,"Ponferrada, Spain",42.5461,-6.5962,,
Santiago de Compostela,2019-06-08,"Santiago de Compostela, Spain",42.8782,-8.5448,,https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Catedral_de_Santiago_de_Compostela.jpg/960px-Catedral_de_Santiago_de_Compostela.jpg
`,
  },
  {
    id: 'transsiberian',
    title: 'Trans-Siberian Railway',
    blurb: 'Moscow to Vladivostok, 1910',
    filename: 'trans-siberian.csv',
    look: { followRoads: false, map: 'paper' },
    csv: `title,date,place,lat,lng,notes,photo
Moscow,1910-07-01,"Moscow, Russia",55.7558,37.6173,,https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Sant_Vasily_cathedral_in_Moscow.JPG/960px-Sant_Vasily_cathedral_in_Moscow.JPG
Yekaterinburg,1910-07-03,"Yekaterinburg, Russia",56.8389,60.6057,,https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Views_of_Yekaterinburg_from_Vysotsky_viewpoint_-_12.jpg/960px-Views_of_Yekaterinburg_from_Vysotsky_viewpoint_-_12.jpg
Novosibirsk,1910-07-06,"Novosibirsk, Russia",55.0084,82.9357,,
Krasnoyarsk,1910-07-09,"Krasnoyarsk, Russia",56.0153,92.8932,,
Irkutsk,1910-07-12,"Irkutsk, Russia",52.2869,104.3050,,https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Lake_Baikal.jpg/960px-Lake_Baikal.jpg
Khabarovsk,1910-07-16,"Khabarovsk, Russia",48.4827,135.0838,,
Vladivostok,1910-07-18,"Vladivostok, Russia",43.1198,131.8869,,https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Vladivostok_TSR.JPG/960px-Vladivostok_TSR.JPG
`,
  },
  {
    id: 'grandtour',
    title: 'Grand Tour of Europe',
    blurb: 'London to Venice, 1788',
    filename: 'grand-tour-europe.csv',
    look: { followRoads: false, map: 'paper' },
    csv: `title,date,place,lat,lng,notes,photo
London,1788-03-15,"London, England",51.5074,-0.1278,,https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Tower_Bridge_2009.jpg/960px-Tower_Bridge_2009.jpg
Paris,1788-04-02,"Paris, France",48.8566,2.3522,,https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Eiffel_Tower_from_the_Tour_Montparnasse_3%2C_Paris_May_2014.jpg/960px-Eiffel_Tower_from_the_Tour_Montparnasse_3%2C_Paris_May_2014.jpg
Geneva,1788-05-20,"Geneva, Switzerland",46.2044,6.1432,,
Florence,1788-06-18,"Florence, Italy",43.7696,11.2558,,https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Florence_Duomo_from_Michelangelo_hill.jpg/960px-Florence_Duomo_from_Michelangelo_hill.jpg
Rome,1788-08-01,"Rome, Italy",41.9028,12.4964,,https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Colosseum_in_Rome%2C_Italy_-_April_2007.jpg/960px-Colosseum_in_Rome%2C_Italy_-_April_2007.jpg
Naples,1788-09-25,"Naples, Italy",40.8518,14.2681,,
Venice,1788-11-10,"Venice, Italy",45.4408,12.3155,,https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Panorama_of_Canal_Grande_and_Ponte_di_Rialto%2C_Venice_-_September_2017.jpg/960px-Panorama_of_Canal_Grande_and_Ponte_di_Rialto%2C_Venice_-_September_2017.jpg
`,
  },
  {
    id: 'appian',
    title: 'Appian Way Journey',
    blurb: 'Rome to Brindisi, AD 120',
    filename: 'appian-way.csv',
    look: { followRoads: false, map: 'terrain' },
    csv: `title,date,place,lat,lng,notes,photo
Rome,0120-03-10,"Rome, Italy",41.9028,12.4964,,https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Colosseum_in_Rome%2C_Italy_-_April_2007.jpg/960px-Colosseum_in_Rome%2C_Italy_-_April_2007.jpg
Albano Laziale,0120-03-11,"Albano Laziale / Alban Hills, Italy",41.7275,12.6611,,
Terracina,0120-03-13,"Terracina, Italy",41.2917,13.2486,,https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Terracina-vista01.jpg/960px-Terracina-vista01.jpg
Capua,0120-03-15,"Capua, Italy",41.1050,14.2125,,
Benevento,0120-03-17,"Benevento, Italy",41.1297,14.7826,,https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Arch_of_Trajan_%28Benevento%29_01.jpg/960px-Arch_of_Trajan_%28Benevento%29_01.jpg
Taranto,0120-03-20,"Taranto, Italy",40.4644,17.2470,,
Brindisi,0120-03-22,"Brindisi, Italy",40.6322,17.9432,,https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Le_colonne_della_Via_Appia_a_Brindisi.jpg/960px-Le_colonne_della_Via_Appia_a_Brindisi.jpg
`,
  },
]

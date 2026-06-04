/** Country → regions/counties/cities for birth-place dropdowns. */
export const BIRTH_COUNTRIES = [
  "Afghanistan", "Algeria", "Argentina", "Australia", "Austria",
  "Bangladesh", "Belgium", "Brazil", "Canada", "Chile", "China",
  "Colombia", "Czech Republic", "Denmark", "Egypt", "Ethiopia",
  "Finland", "France", "Germany", "Ghana", "Greece", "Hong Kong",
  "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Japan", "Jordan", "Kenya", "Kuwait", "Malaysia", "Mexico", "Morocco",
  "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
  "Saudi Arabia", "Singapore", "South Africa", "South Korea", "Spain",
  "Sri Lanka", "Sweden", "Switzerland", "Taiwan", "Tanzania", "Thailand",
  "Turkey", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Venezuela", "Vietnam", "Zimbabwe"
] as const;

export type BirthCountry = (typeof BIRTH_COUNTRIES)[number];

export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  Kenya: [
    "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet",
    "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado",
    "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga",
    "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia",
    "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit",
    "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
    "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
    "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River",
    "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu",
    "Vihiga", "Wajir", "West Pokot", "Other"
  ],
  "United States": [
    "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX",
    "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA",
    "Dallas, TX", "San Francisco, CA", "Miami, FL", "Atlanta, GA",
    "Boston, MA", "Seattle, WA", "Denver, CO", "Nashville, TN",
    "Portland, OR", "Las Vegas, NV", "Detroit, MI", "Memphis, TN",
    "Louisville, KY", "Baltimore, MD", "Milwaukee, WI", "Albuquerque, NM",
    "Tucson, AZ", "Fresno, CA", "Sacramento, CA", "Kansas City, MO",
    "Mesa, AZ", "Omaha, NE", "Cleveland, OH", "Raleigh, NC",
    "Colorado Springs, CO", "Virginia Beach, VA", "Minneapolis, MN",
    "Tampa, FL", "New Orleans, LA", "Arlington, TX", "Wichita, KS",
    "Aurora, CO", "Other"
  ],
  "United Kingdom": [
    "London", "Birmingham", "Manchester", "Glasgow", "Liverpool",
    "Leeds", "Sheffield", "Edinburgh", "Bristol", "Leicester",
    "Coventry", "Bradford", "Cardiff", "Belfast", "Nottingham",
    "Kingston upon Hull", "Newcastle upon Tyne", "Stoke-on-Trent",
    "Southampton", "Derby", "Portsmouth", "Brighton", "Plymouth",
    "Wolverhampton", "Oxford", "Cambridge", "Other"
  ],
  Canada: [
    "Toronto, ON", "Vancouver, BC", "Montreal, QC", "Calgary, AB",
    "Ottawa, ON", "Edmonton, AB", "Winnipeg, MB", "Quebec City, QC",
    "Hamilton, ON", "Kitchener, ON", "London, ON", "Victoria, BC",
    "Halifax, NS", "Oshawa, ON", "Windsor, ON", "Saskatoon, SK",
    "Regina, SK", "Kelowna, BC", "Barrie, ON", "Abbotsford, BC",
    "Other"
  ],
  Australia: [
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide",
    "Canberra", "Gold Coast", "Newcastle", "Wollongong", "Hobart",
    "Geelong", "Townsville", "Cairns", "Darwin", "Toowoomba",
    "Ballarat", "Bendigo", "Launceston", "Mackay", "Rockhampton",
    "Other"
  ],
  India: [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
    "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat",
    "Lucknow", "Kanpur", "Nagpur", "Patna", "Indore",
    "Bhopal", "Ludhiana", "Agra", "Nashik", "Vadodara",
    "Varanasi", "Rajkot", "Meerut", "Srinagar", "Amritsar",
    "Coimbatore", "Visakhapatnam", "Kochi", "Thiruvananthapuram",
    "Guwahati", "Chandigarh", "Other"
  ],
  Nigeria: [
    "Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt",
    "Benin City", "Maiduguri", "Zaria", "Aba", "Jos",
    "Ilorin", "Oyo", "Enugu", "Abeokuta", "Sokoto",
    "Warri", "Kaduna", "Calabar", "Akure", "Bauchi",
    "Uyo", "Asaba", "Owerri", "Yola", "Makurdi", "Other"
  ],
  "South Africa": [
    "Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth",
    "Bloemfontein", "Nelspruit", "Kimberley", "Polokwane", "Rustenburg",
    "East London", "Pietermaritzburg", "Vanderbijlpark", "Vereeniging",
    "George", "Mahikeng", "Upington", "Middelburg", "Other"
  ],
  Germany: [
    "Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt",
    "Stuttgart", "Düsseldorf", "Dortmund", "Essen", "Leipzig",
    "Bremen", "Dresden", "Hanover", "Nuremberg", "Duisburg",
    "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Münster", "Other"
  ],
  France: [
    "Paris", "Marseille", "Lyon", "Toulouse", "Nice",
    "Nantes", "Montpellier", "Strasbourg", "Bordeaux", "Lille",
    "Rennes", "Reims", "Le Havre", "Saint-Étienne", "Toulon",
    "Grenoble", "Dijon", "Angers", "Nîmes", "Other"
  ],
  Japan: [
    "Tokyo", "Osaka", "Yokohama", "Nagoya", "Sapporo",
    "Fukuoka", "Kobe", "Kyoto", "Kawasaki", "Saitama",
    "Hiroshima", "Sendai", "Chiba", "Kitakyushu", "Sakai",
    "Niigata", "Hamamatsu", "Kumamoto", "Sagamihara", "Other"
  ],
  China: [
    "Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu",
    "Tianjin", "Wuhan", "Xi'an", "Hangzhou", "Nanjing",
    "Chongqing", "Shenyang", "Dongguan", "Foshan", "Harbin",
    "Qingdao", "Zhengzhou", "Jinan", "Changsha", "Kunming", "Other"
  ],
  Brazil: [
    "São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza",
    "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Porto Alegre",
    "Belém", "Goiânia", "Guarulhos", "Campinas", "São Luís",
    "Maceió", "Natal", "Teresina", "Campo Grande", "Other"
  ],
  Mexico: [
    "Mexico City", "Guadalajara", "Monterrey", "Puebla", "Tijuana",
    "León", "Juárez", "Torreón", "Querétaro", "San Luis Potosí",
    "Mérida", "Mexicali", "Culiacán", "Hermosillo", "Aguascalientes",
    "Morelia", "Chihuahua", "Veracruz", "Saltillo", "Other"
  ],
  "United Arab Emirates": [
    "Dubai", "Abu Dhabi", "Sharjah", "Ajman",
    "Ras Al Khaimah", "Fujairah", "Umm Al Quwain", "Other"
  ],
  Tanzania: [
    "Dar es Salaam", "Dodoma", "Mwanza", "Arusha", "Mbeya",
    "Morogoro", "Tanga", "Zanzibar City", "Kigoma", "Tabora",
    "Moshi", "Iringa", "Songea", "Lindi", "Mtwara", "Other"
  ],
  Uganda: [
    "Kampala", "Gulu", "Lira", "Mbarara", "Jinja",
    "Bwizibwera", "Mbale", "Mukono", "Kasese", "Masaka",
    "Entebbe", "Arua", "Fort Portal", "Soroti", "Kabale", "Other"
  ],
  Ethiopia: [
    "Addis Ababa", "Dire Dawa", "Mekelle", "Gondar", "Adama",
    "Hawassa", "Bahir Dar", "Dessie", "Jimma", "Jijiga",
    "Shashamane", "Bishoftu", "Sodo", "Arba Minch", "Other"
  ],
  Ghana: [
    "Accra", "Kumasi", "Tamale", "Sekondi-Takoradi", "Cape Coast",
    "Obuasi", "Tema", "Sunyani", "Koforidua", "Ho",
    "Wa", "Bolgatanga", "Techiman", "Teshie", "Other"
  ],
  Egypt: [
    "Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said",
    "Suez", "Luxor", "Mansoura", "El Mahalla El Kubra", "Tanta",
    "Asyut", "Ismailia", "Fayyum", "Zagazig", "Aswan", "Other"
  ],
  "Saudi Arabia": [
    "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam",
    "Khobar", "Tabuk", "Buraidah", "Khamis Mushait", "Hail",
    "Hofuf", "Jubail", "Abha", "Taif", "Yanbu", "Other"
  ],
  Pakistan: [
    "Karachi", "Lahore", "Faisalabad", "Rawalpindi", "Gujranwala",
    "Peshawar", "Multan", "Hyderabad", "Islamabad", "Quetta",
    "Bahawalpur", "Sargodha", "Sialkot", "Sukkur", "Larkana", "Other"
  ],
  Bangladesh: [
    "Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna",
    "Barisal", "Comilla", "Narayanganj", "Gazipur", "Mymensingh", "Other"
  ],
  "South Korea": [
    "Seoul", "Busan", "Incheon", "Daegu", "Daejeon",
    "Gwangju", "Suwon", "Ulsan", "Changwon", "Seongnam",
    "Goyang", "Yongin", "Bucheon", "Cheongju", "Other"
  ],
  Spain: [
    "Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza",
    "Málaga", "Murcia", "Palma", "Las Palmas", "Bilbao",
    "Alicante", "Córdoba", "Valladolid", "Vigo", "Gijón", "Other"
  ],
  Italy: [
    "Rome", "Milan", "Naples", "Turin", "Palermo",
    "Genoa", "Bologna", "Florence", "Bari", "Catania",
    "Venice", "Verona", "Messina", "Padua", "Trieste", "Other"
  ],
  Russia: [
    "Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Kazan",
    "Nizhny Novgorod", "Chelyabinsk", "Samara", "Omsk", "Rostov-on-Don",
    "Ufa", "Krasnoyarsk", "Voronezh", "Perm", "Volgograd", "Other"
  ],
  Turkey: [
    "Istanbul", "Ankara", "Izmir", "Bursa", "Antalya",
    "Adana", "Konya", "Gaziantep", "Mersin", "Kayseri",
    "Eskişehir", "Samsun", "Diyarbakır", "Denizli", "Other"
  ],
  Malaysia: [
    "Kuala Lumpur", "George Town", "Ipoh", "Shah Alam", "Petaling Jaya",
    "Johor Bahru", "Subang Jaya", "Kota Kinabalu", "Kuching", "Klang",
    "Ampang Jaya", "Seremban", "Other"
  ],
  Philippines: [
    "Manila", "Quezon City", "Davao City", "Caloocan", "Cebu City",
    "Zamboanga City", "Taguig", "Antipolo", "Pasig", "Cagayan de Oro",
    "Makati", "Parañaque", "Las Piñas", "Other"
  ],
  Indonesia: [
    "Jakarta", "Surabaya", "Bandung", "Medan", "Semarang",
    "Makassar", "Palembang", "Tangerang", "Depok", "Bekasi",
    "Denpasar", "Yogyakarta", "Malang", "Batam", "Other"
  ],
  Netherlands: [
    "Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven",
    "Tilburg", "Groningen", "Almere", "Breda", "Nijmegen", "Other"
  ],
  Poland: [
    "Warsaw", "Kraków", "Łódź", "Wrocław", "Poznań",
    "Gdańsk", "Szczecin", "Bydgoszcz", "Lublin", "Katowice", "Other"
  ],
  Argentina: [
    "Buenos Aires", "Córdoba", "Rosario", "Mendoza", "Tucumán",
    "La Plata", "Mar del Plata", "Quilmes", "Salta", "Santa Fe", "Other"
  ],
  Colombia: [
    "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena",
    "Bucaramanga", "Pereira", "Manizales", "Santa Marta", "Other"
  ],
  "New Zealand": [
    "Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga",
    "Napier-Hastings", "Dunedin", "Palmerston North", "Nelson", "Other"
  ],
  Singapore: ["Singapore"],
  "Hong Kong": ["Hong Kong Island", "Kowloon", "New Territories", "Other"],
  Morocco: [
    "Casablanca", "Rabat", "Fez", "Marrakech", "Agadir",
    "Tangier", "Meknes", "Oujda", "Kenitra", "Tetouan", "Other"
  ],
  Iraq: [
    "Baghdad", "Basra", "Mosul", "Erbil", "Kirkuk",
    "Najaf", "Karbala", "Nasiriyah", "Amarah", "Other"
  ],
  Iran: [
    "Tehran", "Mashhad", "Isfahan", "Karaj", "Tabriz",
    "Shiraz", "Qom", "Ahvaz", "Kermanshah", "Urmia", "Other"
  ],
  Israel: [
    "Jerusalem", "Tel Aviv", "Haifa", "Rishon LeZion", "Petah Tikva",
    "Ashdod", "Netanya", "Beer Sheva", "Holon", "Bnei Brak", "Other"
  ],
  Jordan: [
    "Amman", "Zarqa", "Irbid", "Russeifa", "Aqaba",
    "Madaba", "Jerash", "Mafraq", "Other"
  ],
  Kuwait: ["Kuwait City", "Hawalli", "Ahmadi", "Farwaniya", "Other"],
  Qatar: ["Doha", "Al Rayyan", "Umm Salal", "Al Wakrah", "Other"],
  Chile: [
    "Santiago", "Valparaíso", "Concepción", "Antofagasta", "Temuco",
    "Rancagua", "Talca", "Arica", "Iquique", "Other"
  ],
  Peru: [
    "Lima", "Arequipa", "Trujillo", "Chiclayo", "Iquitos",
    "Cusco", "Piura", "Huancayo", "Chimbote", "Other"
  ],
  Venezuela: [
    "Caracas", "Maracaibo", "Valencia", "Barquisimeto", "Maracay",
    "Mérida", "Barcelona", "Maturín", "Other"
  ],
  Vietnam: [
    "Ho Chi Minh City", "Hanoi", "Da Nang", "Haiphong", "Can Tho",
    "Bien Hoa", "Hue", "Nha Trang", "Buon Ma Thuot", "Other"
  ],
  Thailand: [
    "Bangkok", "Chiang Mai", "Pattaya", "Hat Yai", "Khon Kaen",
    "Nakhon Ratchasima", "Udon Thani", "Nonthaburi", "Phuket", "Other"
  ],
  Zimbabwe: [
    "Harare", "Bulawayo", "Chitungwiza", "Mutare", "Gweru",
    "Kwekwe", "Kadoma", "Masvingo", "Hwange", "Other"
  ],
  "Sri Lanka": [
    "Colombo", "Kandy", "Galle", "Jaffna", "Negombo",
    "Trincomalee", "Batticaloa", "Anuradhapura", "Other"
  ],
  Ireland: [
    "Dublin", "Cork", "Limerick", "Galway", "Waterford",
    "Drogheda", "Dundalk", "Swords", "Bray", "Other"
  ],
  Portugal: [
    "Lisbon", "Porto", "Amadora", "Braga", "Setúbal",
    "Coimbra", "Funchal", "Almada", "Aveiro", "Other"
  ],
  Sweden: [
    "Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås",
    "Örebro", "Linköping", "Helsingborg", "Jönköping", "Other"
  ],
  Norway: [
    "Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen",
    "Fredrikstad", "Kristiansand", "Tromsø", "Other"
  ],
  Denmark: [
    "Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg",
    "Randers", "Kolding", "Horsens", "Other"
  ],
  Finland: [
    "Helsinki", "Espoo", "Tampere", "Vantaa", "Oulu",
    "Turku", "Jyväskylä", "Kuopio", "Other"
  ],
  Belgium: [
    "Brussels", "Antwerp", "Ghent", "Charleroi", "Liège",
    "Bruges", "Namur", "Leuven", "Other"
  ],
  Austria: [
    "Vienna", "Graz", "Linz", "Salzburg", "Innsbruck",
    "Klagenfurt", "Villach", "Wels", "Other"
  ],
  Switzerland: [
    "Zurich", "Geneva", "Basel", "Lausanne", "Bern",
    "Winterthur", "Lucerne", "St. Gallen", "Other"
  ],
  "Czech Republic": [
    "Prague", "Brno", "Ostrava", "Plzeň", "Liberec",
    "Olomouc", "Ústí nad Labem", "České Budějovice", "Other"
  ],
  Romania: [
    "Bucharest", "Cluj-Napoca", "Timișoara", "Iași", "Constanța",
    "Craiova", "Brașov", "Galați", "Ploiești", "Other"
  ],
  Ukraine: [
    "Kyiv", "Kharkiv", "Odesa", "Dnipro", "Donetsk",
    "Zaporizhzhia", "Lviv", "Kryvyi Rih", "Mykolaiv", "Other"
  ],
  Greece: [
    "Athens", "Thessaloniki", "Patras", "Heraklion", "Larissa",
    "Volos", "Rhodes", "Ioannina", "Chania", "Other"
  ],
  Afghanistan: [
    "Kabul", "Kandahar", "Herat", "Mazar-i-Sharif", "Jalalabad",
    "Kunduz", "Ghazni", "Balkh", "Other"
  ],
  Algeria: [
    "Algiers", "Oran", "Constantine", "Annaba", "Blida",
    "Batna", "Djelfa", "Sétif", "Sidi Bel Abbès", "Other"
  ],
  Taiwan: [
    "Taipei", "Kaohsiung", "Taichung", "Tainan", "Taoyuan",
    "Hsinchu", "Keelung", "Chiayi", "Other"
  ]
};

/** Cities/regions for a country; falls back gracefully */
export function citiesForCountry(country: string): string[] {
  const trimmed = country.trim();
  if (!trimmed) return [];
  const list = CITIES_BY_COUNTRY[trimmed];
  if (list?.length) return list;
  return ["Other / not listed"];
}

export function isKnownCountry(country: string): boolean {
  return BIRTH_COUNTRIES.includes(country as BirthCountry);
}

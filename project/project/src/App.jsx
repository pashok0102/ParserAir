import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const TEXT = {
  ru: {
    sourceBoth: 'Все источники',
    allAirlines: 'Все авиакомпании',
    direct: 'Прямой рейс',
    oneStop: '1 пересадка',
    manyStops: (count) => `${count} пересадки`,
    noDate: 'Дата не указана',
    priceOnSite: 'Цена на сайте',
    airline: 'Авиакомпания',
    baggage: 'Багаж и тариф',
    departure: 'Вылет',
    estimatedNote: 'Для режима "Хоть куда" цена ориентировочная. Точную цену смотри после перехода на сайт источника.',
    exactNote: 'Цена может отличаться на 300-400 RUB из-за времени обновления выдачи, комиссии источника или изменения тарифа в момент перехода.',
    removeFavorite: 'Убрать из избранного',
    addFavorite: 'В избранное',
    openTicket: 'Открыть билет',
    account: 'Аккаунт',
    active: 'Активен',
    checkingSession: 'Проверяем сессию пользователя.',
    accountAuthorized: 'Аккаунт авторизован. Избранные билеты привязаны только к этому пользователю.',
    logout: 'Выйти',
    login: 'Вход',
    register: 'Регистрация',
    username: 'Логин',
    usernamePlaceholder: 'Введите логин',
    password: 'Пароль',
    passwordPlaceholder: 'Введите пароль',
    pleaseWait: 'Подождите...',
    createAccount: 'Создать аккаунт',
    signIn: 'Войти',
    heroTitle: 'Один экран для поиска выгодных билетов',
    heroText: 'AirParser помогает быстро проверить перелет по нужному маршруту, собрать предложения из разных источников и сразу перейти к подходящему варианту. Пользователь видит один понятный экран вместо ручного сравнения нескольких сайтов по очереди.',
    heroStart: 'Запуск',
    heroMore: 'Подробнее',
    heroNote: 'После входа можно искать горячие билеты сразу по диапазону дат и сохранять нужные варианты в избранное.',
    visualSource: 'Гибкий выбор источника',
    visualCalendar: 'Удобный календарь дат',
    visualSearch: 'Общий поиск по парсерам',
    about: 'Подробнее',
    aboutTitle: 'Как работает AirParser',
    aboutText1: 'AirParser создан для быстрого поиска авиабилетов по конкретному маршруту и выбранным датам. Сервис получает запрос пользователя, проверяет доступные предложения в подключенных билетных источниках и собирает найденные варианты в одной выдаче.',
    aboutText2: 'Можно искать либо по одной дате вылета, либо по диапазону дат. В режиме одного дня сервис покажет самые горячие билеты на конкретную дату. В режиме диапазона он пройдет по всем дням между датой с и датой по.',
    launch: 'Запуск',
    parserWindow: 'Окно парсера',
    parserText: 'Здесь запускается основной поиск. Укажи город отправления, направление, выбери режим даты и один источник, по которому нужно искать горячие билеты.',
    loginFirst: 'Сначала войди в аккаунт, затем запускай поиск.',
    from: 'Откуда',
    fromPlaceholder: 'Например, Москва / Moscow',
    to: 'Куда',
    toPlaceholder: 'Например, Сочи / Sochi',
    routeLogic: 'Логика направления',
    routeText: 'Если нужен поиск из города вылета по всем доступным направлениям, включи режим "Хоть куда". Тогда поле "Куда" отключится.',
    exactRoute: 'Точный маршрут',
    anywhere: 'Хоть куда',
    departureDate: 'Дата вылета',
    dateFrom: 'Дата с',
    dateTo: 'Дата по',
    calendarLogic: 'Логика календаря',
    calendarText: 'Выбери только один режим. Одновременно парсить один день и диапазон нельзя.',
    oneDay: 'Один день',
    dateRange: 'Диапазон дат',
    priceFrom: 'Цена от',
    priceTo: 'Цена до',
    parserChoice: 'Какой парсер использовать',
    parserChoiceText: 'Выбрать можно только один источник. Если включен режим "Хоть куда", поиск идет через Aviasales.',
    searchingRange: 'Ищем билеты по диапазону...',
    searchingDate: 'Ищем билеты по выбранной дате...',
    findTickets: 'Найти билеты',
    loginToSearch: 'Войдите для поиска',
    favorites: 'Избранное',
    history: 'История поисков',
    searchHistory: 'Последние запросы',
    historyUser: 'Маршрут, дата, источник и фильтр цены сохраняются для текущего аккаунта.',
    noHistory: 'История поиска пока пуста.',
    repeatSearch: 'Повторить поиск',
    removeHistoryItem: 'Удалить из истории',
    openHistoryTickets: 'Открыть билеты',
    historyTicketsTitle: 'Билеты из истории поиска',
    viewTickets: 'Посмотреть билеты',
    loadingStepCollect: 'Собираем билеты из источников',
    loadingStepFilter: 'Фильтруем результаты по дате и цене',
    loadingStepBuild: 'Формируем итоговую выдачу',
    savedTickets: 'Сохраненные билеты',
    favoritesUser: 'Этот список хранится отдельно для текущего аккаунта.',
    favoritesNeedLogin: 'Войди в аккаунт, чтобы сохранять билеты в избранное.',
    favoritesAvailable: 'Избранное станет доступно после авторизации.',
    noFavorites: 'Пока нет сохраненных билетов.',
    results: 'Результаты',
    parserOutput: 'Выдача парсера',
    updated: 'Обновлено',
    outputHint: 'После запуска здесь появятся найденные билеты по выбранной логике даты.',
    loadingRange: 'Ищем билеты по всем дням выбранного диапазона',
    loadingDate: 'Ищем билеты по выбранной дате вылета',
    loadingBoth: 'Проверяем все подключенные источники и собираем горячие варианты в одну выдачу.',
    loadingSource: (label) => `Проверяем источник ${label} и собираем актуальные предложения.`,
    loadingLongRange: 'Длинный диапазон: собираем билеты частями по диапазону, поэтому ответ может занять больше времени.',
    sortToggle: 'Сортировка по цене',
    sortCheapFirst: 'Сначала дешевле',
    noResults: 'Пока нет результатов. Запусти поиск через окно парсера выше.',
    backendError: 'Нет соединения с backend. Запусти Django API на 127.0.0.1:8000.',
    authFailed: 'Ошибка авторизации',
    favoriteFailed: 'Ошибка избранного',
    searchFailed: 'Ошибка поиска',
    navLogo: 'AirParser',
    navHome: 'Главная',
    navAbout: 'О сервисе',
    navSearch: 'Поиск',
    navHistory: 'История',
    navFavorites: 'Избранное',
    navResults: 'Результаты',
    navAccount: 'Аккаунт',
    navLanguage: 'Язык',
    navTheme: 'Тема',
    footerBrand: 'AirParser',
    footerText: 'Поиск билетов, история запросов и избранное в одном интерфейсе.',
    footerCopy: 'Все права защищены.',
  },
  en: {
    sourceBoth: 'All sources',
    allAirlines: 'All airlines',
    direct: 'Direct flight',
    oneStop: '1 stop',
    manyStops: (count) => `${count} stops`,
    noDate: 'Date not specified',
    priceOnSite: 'Price on site',
    airline: 'Airline',
    baggage: 'Baggage and fare',
    departure: 'Departure',
    estimatedNote: 'In "Anywhere" mode the price is approximate. Check the exact price after opening the source site.',
    exactNote: 'Price may differ by 300-400 RUB due to update timing, source commission, or fare changes at the moment of redirect.',
    removeFavorite: 'Remove favorite',
    addFavorite: 'Add to favorites',
    openTicket: 'Open ticket',
    account: 'Account',
    active: 'Active',
    checkingSession: 'Checking session.',
    accountAuthorized: 'The account is authorized. Favorite tickets are tied only to this user.',
    logout: 'Logout',
    login: 'Login',
    register: 'Register',
    username: 'Username',
    usernamePlaceholder: 'Enter username',
    password: 'Password',
    passwordPlaceholder: 'Enter password',
    pleaseWait: 'Please wait...',
    createAccount: 'Create account',
    signIn: 'Sign in',
    heroTitle: 'One screen for cheap ticket search',
    heroText: 'AirParser helps quickly check a route, collect offers from multiple sources, and move straight to the right option. The user gets one clear screen instead of manually comparing several sites.',
    heroStart: 'Start',
    heroMore: 'Details',
    heroNote: 'After sign-in you can search hot tickets by date range and save needed options to favorites.',
    visualSource: 'Flexible source choice',
    visualCalendar: 'Convenient date calendar',
    visualSearch: 'Unified parser search',
    about: 'Details',
    aboutTitle: 'How AirParser works',
    aboutText1: 'AirParser is built for fast flight search by route and dates. It receives a user request, checks available offers in connected ticket sources, and combines the results into one feed.',
    aboutText2: 'You can search either by one departure date or by a date range. One-day mode shows the hottest tickets for a single date. Range mode goes through every day between the start and end dates.',
    launch: 'Launch',
    parserWindow: 'Parser window',
    parserText: 'This is the main search area. Set the departure city, destination, date mode, and one source to search hot tickets.',
    loginFirst: 'Sign in first, then run the search.',
    from: 'From',
    fromPlaceholder: 'For example, Moscow',
    to: 'To',
    toPlaceholder: 'For example, Sochi',
    routeLogic: 'Route logic',
    routeText: 'If you need search from the departure city to any available destination, enable "Anywhere". The "To" field will be disabled.',
    exactRoute: 'Exact route',
    anywhere: 'Anywhere',
    departureDate: 'Departure date',
    dateFrom: 'Date from',
    dateTo: 'Date to',
    calendarLogic: 'Calendar logic',
    calendarText: 'Choose only one mode. One-day and range parsing cannot run together.',
    oneDay: 'One day',
    dateRange: 'Date range',
    priceFrom: 'Price from',
    priceTo: 'Price to',
    parserChoice: 'Which parser to use',
    parserChoiceText: 'Only one source can be selected. If "Anywhere" is enabled, search uses Aviasales.',
    searchingRange: 'Searching by range...',
    searchingDate: 'Searching selected date...',
    findTickets: 'Find tickets',
    loginToSearch: 'Sign in to search',
    favorites: 'Favorites',
    history: 'Search history',
    searchHistory: 'Recent queries',
    historyUser: 'Route, date, source and price filter are saved for the current account.',
    noHistory: 'Search history is empty.',
    repeatSearch: 'Repeat search',
    removeHistoryItem: 'Remove from history',
    openHistoryTickets: 'Open tickets',
    historyTicketsTitle: 'Tickets from search history',
    viewTickets: 'View tickets',
    loadingStepCollect: 'Collecting tickets from sources',
    loadingStepFilter: 'Filtering results by date and price',
    loadingStepBuild: 'Preparing the final result list',
    savedTickets: 'Saved tickets',
    favoritesUser: 'This list is stored separately for the current account.',
    favoritesNeedLogin: 'Sign in to save tickets to favorites.',
    favoritesAvailable: 'Favorites will be available after authorization.',
    noFavorites: 'No saved tickets yet.',
    results: 'Results',
    parserOutput: 'Parser output',
    updated: 'Updated',
    outputHint: 'Found tickets will appear here after the search starts.',
    loadingRange: 'Searching tickets for every day in the selected range',
    loadingDate: 'Searching tickets for the selected departure date',
    loadingBoth: 'Checking all connected sources and building one combined result set.',
    loadingSource: (label) => `Checking ${label} and collecting current offers.`,
    loadingLongRange: 'Long range: collecting tickets in chunks, so the response may take longer.',
    sortToggle: 'Price sorting',
    sortCheapFirst: 'Cheapest first',
    noResults: 'No results yet. Start a search in the parser window above.',
    backendError: 'No backend connection. Start Django API on 127.0.0.1:8000.',
    authFailed: 'Authorization failed',
    favoriteFailed: 'Favorite update failed',
    searchFailed: 'Search error',
    navLogo: 'AirParser',
    navHome: 'Home',
    navAbout: 'About',
    navSearch: 'Search',
    navHistory: 'History',
    navFavorites: 'Favorites',
    navResults: 'Results',
    navAccount: 'Account',
    navLanguage: 'Language',
    navTheme: 'Theme',
    footerBrand: 'AirParser',
    footerText: 'Ticket search, query history, and favorites in one interface.',
    footerCopy: 'All rights reserved.',
  },
}

const SOURCE_OPTIONS = [
  { value: 'both', label: 'Все источники' },
  { value: 'aviasales', label: 'Aviasales' },
  { value: 'tutu', label: 'Tutu.ru' },
  { value: 'kupibilet', label: 'Kupibilet' },
]

const AIRLINE_LABELS = {
  DP: { ru: 'Победа', en: 'Pobeda' },
  SU: { ru: 'Аэрофлот', en: 'Aeroflot' },
  N4: { ru: 'Nordwind Airlines', en: 'Nordwind Airlines' },
  S7: { ru: 'S7 Airlines', en: 'S7 Airlines' },
  UT: { ru: 'ЮТэйр', en: 'Utair' },
  U6: { ru: 'Уральские авиалинии', en: 'Ural Airlines' },
  FV: { ru: 'Россия', en: 'Rossiya Airlines' },
  WZ: { ru: 'Red Wings', en: 'Red Wings' },
  '5N': { ru: 'Smartavia', en: 'Smartavia' },
  A4: { ru: 'Азимут', en: 'Azimuth' },
  YC: { ru: 'Ямал', en: 'Yamal' },
  EO: { ru: 'Икар', en: 'Ikar' },
  IO: { ru: 'ИрАэро', en: 'IrAero' },
  RT: { ru: 'ЮВТ Аэро', en: 'UVT Aero' },
}

const CIS_CITY_OPTIONS = [
  { ru: 'Москва', en: 'Moscow', iata: 'MOW', aliases: ['Мск'] },
  { ru: 'Санкт-Петербург', en: 'Saint Petersburg', iata: 'LED', aliases: ['Петербург', 'СПб', 'St Petersburg'] },
  { ru: 'Сочи', en: 'Sochi', iata: 'AER' },
  { ru: 'Оренбург', en: 'Orenburg', iata: 'REN' },
  { ru: 'Орел', en: 'Orel', iata: 'OEL' },
  { ru: 'Самара', en: 'Samara', iata: 'KUF' },
  { ru: 'Казань', en: 'Kazan', iata: 'KZN' },
  { ru: 'Уфа', en: 'Ufa', iata: 'UFA' },
  { ru: 'Омск', en: 'Omsk', iata: 'OMS' },
  { ru: 'Екатеринбург', en: 'Yekaterinburg', iata: 'SVX', aliases: ['Ekaterinburg'] },
  { ru: 'Новосибирск', en: 'Novosibirsk', iata: 'OVB' },
  { ru: 'Барнаул', en: 'Barnaul', iata: 'BAX' },
  { ru: 'Чебоксары', en: 'Cheboksary', iata: 'CSY' },
  { ru: 'Череповец', en: 'Cherepovets', iata: 'CEE' },
  { ru: 'Нижний Новгород', en: 'Nizhny Novgorod', iata: 'GOJ', aliases: ['Nizhniy Novgorod'] },
  { ru: 'Краснодар', en: 'Krasnodar', iata: 'KRR' },
  { ru: 'Минеральные Воды', en: 'Mineralnye Vody', iata: 'MRV', aliases: ['Mineral Waters'] },
  { ru: 'Махачкала', en: 'Makhachkala', iata: 'MCX' },
  { ru: 'Калининград', en: 'Kaliningrad', iata: 'KGD' },
  { ru: 'Мурманск', en: 'Murmansk', iata: 'MMK' },
  { ru: 'Архангельск', en: 'Arkhangelsk', iata: 'ARH' },
  { ru: 'Тюмень', en: 'Tyumen', iata: 'TJM' },
  { ru: 'Сургут', en: 'Surgut', iata: 'SGC' },
  { ru: 'Красноярск', en: 'Krasnoyarsk', iata: 'KJA' },
  { ru: 'Иркутск', en: 'Irkutsk', iata: 'IKT' },
  { ru: 'Владивосток', en: 'Vladivostok', iata: 'VVO' },
  { ru: 'Минск', en: 'Minsk', iata: 'MSQ' },
  { ru: 'Астана', en: 'Astana', iata: 'NQZ', aliases: ['Nur-Sultan'] },
  { ru: 'Алматы', en: 'Almaty', iata: 'ALA' },
  { ru: 'Бишкек', en: 'Bishkek', iata: 'FRU' },
  { ru: 'Ташкент', en: 'Tashkent', iata: 'TAS' },
  { ru: 'Душанбе', en: 'Dushanbe', iata: 'DYU' },
  { ru: 'Баку', en: 'Baku', iata: 'GYD' },
  { ru: 'Ереван', en: 'Yerevan', iata: 'EVN' },
]

const CITY_TO_IATA = CIS_CITY_OPTIONS.reduce((acc, city) => {
  acc[city.ru.toLowerCase()] = city.iata
  acc[city.en.toLowerCase()] = city.iata
  city.aliases?.forEach((alias) => {
    acc[alias.toLowerCase()] = city.iata
  })
  return acc
}, {})

const CITY_AUTOCOMPLETE_OPTIONS = CIS_CITY_OPTIONS.flatMap((city) => {
  const values = [city.ru, city.en, ...(city.aliases || [])]
  return values.map((value) => ({
    value,
    label: `${city.ru} / ${city.en} · ${city.iata}`,
  }))
})

const LOCATION_LABELS = {
  MOW: { ru: 'Москва', en: 'Moscow' },
  LED: { ru: 'Санкт-Петербург', en: 'Saint Petersburg' },
  AER: { ru: 'Сочи', en: 'Sochi' },
  REN: { ru: 'Оренбург', en: 'Orenburg' },
  OEL: { ru: 'Орел', en: 'Orel' },
  KUF: { ru: 'Самара', en: 'Samara' },
  CSY: { ru: 'Чебоксары', en: 'Cheboksary' },
  CEE: { ru: 'Череповец', en: 'Cherepovets' },
  GOJ: { ru: 'Нижний Новгород', en: 'Nizhny Novgorod' },
  BAX: { ru: 'Барнаул', en: 'Barnaul' },
  KZN: { ru: 'Казань', en: 'Kazan' },
  SVX: { ru: 'Екатеринбург', en: 'Yekaterinburg' },
  OVB: { ru: 'Новосибирск', en: 'Novosibirsk' },
  KRR: { ru: 'Краснодар', en: 'Krasnodar' },
  MRV: { ru: 'Минеральные Воды', en: 'Mineralnye Vody' },
  MCX: { ru: 'Махачкала', en: 'Makhachkala' },
  KGD: { ru: 'Калининград', en: 'Kaliningrad' },
  OMS: { ru: 'Омск', en: 'Omsk' },
  UFA: { ru: 'Уфа', en: 'Ufa' },
  MMK: { ru: 'Мурманск', en: 'Murmansk' },
  ARH: { ru: 'Архангельск', en: 'Arkhangelsk' },
  TJM: { ru: 'Тюмень', en: 'Tyumen' },
  SGC: { ru: 'Сургут', en: 'Surgut' },
  KJA: { ru: 'Красноярск', en: 'Krasnoyarsk' },
  IKT: { ru: 'Иркутск', en: 'Irkutsk' },
  VVO: { ru: 'Владивосток', en: 'Vladivostok' },
  MSQ: { ru: 'Минск', en: 'Minsk' },
  NQZ: { ru: 'Астана', en: 'Astana' },
  ALA: { ru: 'Алматы', en: 'Almaty' },
  FRU: { ru: 'Бишкек', en: 'Bishkek' },
  TAS: { ru: 'Ташкент', en: 'Tashkent' },
  DYU: { ru: 'Душанбе', en: 'Dushanbe' },
  GYD: { ru: 'Баку', en: 'Baku' },
  EVN: { ru: 'Ереван', en: 'Yerevan' },
  KVK: { ru: 'Кировск (Апатиты)', en: 'Kirovsk (Apatity)' },
  SVO: { ru: 'Шереметьево', en: 'Sheremetyevo' },
  VKO: { ru: 'Внуково', en: 'Vnukovo' },
  DME: { ru: 'Домодедово', en: 'Domodedovo' },
  ZIA: { ru: 'Жуковский', en: 'Zhukovsky' },
  CSY_AIRPORT: { ru: 'Чебоксары', en: 'Cheboksary' },
}

const LOCATION_NAME_TRANSLATIONS = {
  'москва': { ru: 'Москва', en: 'Moscow' },
  'шереметьево': { ru: 'Шереметьево', en: 'Sheremetyevo' },
  'внуково': { ru: 'Внуково', en: 'Vnukovo' },
  'домодедово': { ru: 'Домодедово', en: 'Domodedovo' },
  'жуковский': { ru: 'Жуковский', en: 'Zhukovsky' },
  'оренбург': { ru: 'Оренбург', en: 'Orenburg' },
  'орел': { ru: 'Орел', en: 'Orel' },
  'сочи': { ru: 'Сочи', en: 'Sochi' },
  'самара': { ru: 'Самара', en: 'Samara' },
  'чебоксары': { ru: 'Чебоксары', en: 'Cheboksary' },
  'череповец': { ru: 'Череповец', en: 'Cherepovets' },
  'нижний новгород': { ru: 'Нижний Новгород', en: 'Nizhny Novgorod' },
  'барнаул': { ru: 'Барнаул', en: 'Barnaul' },
  'санкт петербург': { ru: 'Санкт-Петербург', en: 'Saint Petersburg' },
  'мурманск': { ru: 'Мурманск', en: 'Murmansk' },
  'архангельск': { ru: 'Архангельск', en: 'Arkhangelsk' },
  'тюмень': { ru: 'Тюмень', en: 'Tyumen' },
  'сургут': { ru: 'Сургут', en: 'Surgut' },
  'красноярск': { ru: 'Красноярск', en: 'Krasnoyarsk' },
  'иркутск': { ru: 'Иркутск', en: 'Irkutsk' },
  'владивосток': { ru: 'Владивосток', en: 'Vladivostok' },
  'минск': { ru: 'Минск', en: 'Minsk' },
  'астана': { ru: 'Астана', en: 'Astana' },
  'алматы': { ru: 'Алматы', en: 'Almaty' },
  'бишкек': { ru: 'Бишкек', en: 'Bishkek' },
  'ташкент': { ru: 'Ташкент', en: 'Tashkent' },
  'душанбе': { ru: 'Душанбе', en: 'Dushanbe' },
  'баку': { ru: 'Баку', en: 'Baku' },
  'ереван': { ru: 'Ереван', en: 'Yerevan' },
  'кировск (апатиты)': { ru: 'Кировск (Апатиты)', en: 'Kirovsk (Apatity)' },
  'апатиты': { ru: 'Апатиты', en: 'Apatity' },
}

const TRANSLIT_MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

function transliterateCyrillic(value) {
  let result = ''
  for (const char of String(value || '')) {
    const lower = char.toLowerCase()
    const mapped = TRANSLIT_MAP[lower]
    if (mapped === undefined) {
      result += char
      continue
    }
    result += char === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1)
  }
  return result
}

function normalizeLocationKey(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,]/g, ' ')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
}

function translateLocationLabel(label, code, lang = 'ru') {
  const upperCode = String(code || '').trim().toUpperCase()
  if (upperCode && LOCATION_LABELS[upperCode]) {
    return LOCATION_LABELS[upperCode][lang] || LOCATION_LABELS[upperCode].ru
  }
  if (!label) return ''
  const key = normalizeLocationKey(String(label))
  if (LOCATION_NAME_TRANSLATIONS[key]) {
    return LOCATION_NAME_TRANSLATIONS[key][lang] || LOCATION_NAME_TRANSLATIONS[key].ru
  }
  if (lang === 'ru') return label
  return transliterateCyrillic(label)
}

function normalizeLocation(value) {
  const cleaned = value.trim()
  const upper = cleaned.toUpperCase()
  if (/^[A-Z]{3}$/.test(upper)) return upper
  return CITY_TO_IATA[normalizeLocationKey(cleaned)] || cleaned
}

function formatTransfers(count, lang = 'ru') {
  const t = TEXT[lang] || TEXT.ru
  if (count === 0) return t.direct
  if (count === 1) return t.oneStop
  return t.manyStops(count)
}

function formatDateTime(value, lang = 'ru') {
  const t = TEXT[lang] || TEXT.ru
  if (!value) return t.noDate
  try {
    return new Date(value).toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function formatAirlineName(value, lang = 'ru') {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const upper = raw.toUpperCase()
  if (AIRLINE_LABELS[upper]) return AIRLINE_LABELS[upper][lang] || AIRLINE_LABELS[upper].ru
  return raw
}

function normalizePriceValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits ? Number(digits) : Number.MAX_SAFE_INTEGER
}

function compareTicketsByPrice(left, right) {
  const leftPrice = normalizePriceValue(left?.price)
  const rightPrice = normalizePriceValue(right?.price)
  if (leftPrice !== rightPrice) return leftPrice - rightPrice

  const departureCompare = String(left?.departure_at || '').localeCompare(String(right?.departure_at || ''))
  if (departureCompare !== 0) return departureCompare

  const transfersCompare = Number(left?.transfers ?? Number.MAX_SAFE_INTEGER) - Number(right?.transfers ?? Number.MAX_SAFE_INTEGER)
  if (transfersCompare !== 0) return transfersCompare

  const sourceCompare = String(left?.source || '').localeCompare(String(right?.source || ''))
  if (sourceCompare !== 0) return sourceCompare

  const airlineCompare = String(left?.airline || '').localeCompare(String(right?.airline || ''))
  if (airlineCompare !== 0) return airlineCompare

  const originCompare = String(left?.origin || left?.origin_code || '').localeCompare(String(right?.origin || right?.origin_code || ''))
  if (originCompare !== 0) return originCompare

  const destinationCompare = String(left?.destination || left?.destination_code || '').localeCompare(String(right?.destination || right?.destination_code || ''))
  if (destinationCompare !== 0) return destinationCompare

  return String(left?.ticket_key || left?.link || '').localeCompare(String(right?.ticket_key || right?.link || ''))
}

function sortTicketItems(items, enabled) {
  if (!enabled) return items
  return [...items].sort(compareTicketsByPrice)
}

function buildRenderTicketKey(ticket, index, prefix = 'ticket') {
  return [
    prefix,
    ticket?.ticket_key || '',
    ticket?.source || '',
    ticket?.departure_at || '',
    ticket?.price ?? '',
    ticket?.link || '',
    index,
  ].join('|')
}


function scrollToSection(id) {
  const node = document.getElementById(id)
  if (!node) return
  const topbar = document.querySelector('.topbar')
  const topbarHeight = topbar instanceof HTMLElement ? topbar.offsetHeight : 0
  const targetTop = node.getBoundingClientRect().top + window.scrollY - topbarHeight - 18
  window.scrollTo({
    top: Math.max(targetTop, 0),
    behavior: 'smooth',
  })
}

function formatInputDate(value) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(value, days) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

const CALENDAR_MONTHS = {
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

const CALENDAR_WEEKDAYS = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
}

function parseInputDateValue(value) {
  if (!value) return null
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function getRangeDays(startValue, endValue) {
  const start = parseInputDateValue(startValue)
  const end = parseInputDateValue(endValue)
  if (!start || !end) return 0
  const diff = end.getTime() - start.getTime()
  if (diff < 0) return 0
  return Math.floor(diff / 86400000) + 1
}

function formatCalendarDisplay(value, lang) {
  const parsed = parseInputDateValue(value)
  if (!parsed) return ''
  return parsed.toLocaleDateString(lang === 'en' ? 'en-GB' : 'ru-RU')
}

function getCalendarGrid(monthDate) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const gridStart = new Date(monthStart)
  const offset = (monthStart.getDay() + 6) % 7
  gridStart.setDate(monthStart.getDate() - offset)

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart)
    current.setDate(gridStart.getDate() + index)
    return current
  })
}

function CalendarField({ name, value, onChange, lang, placeholder }) {
  const popupRef = useRef(null)
  const triggerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [monthView, setMonthView] = useState(() => parseInputDateValue(value) || new Date())

  useEffect(() => {
    const parsed = parseInputDateValue(value)
    if (parsed) {
      setMonthView(parsed)
    }
  }, [value])

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (
        !popupRef.current?.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const parsedValue = parseInputDateValue(value)
  const days = getCalendarGrid(monthView)
  const weekdays = CALENDAR_WEEKDAYS[lang] || CALENDAR_WEEKDAYS.ru
  const months = CALENDAR_MONTHS[lang] || CALENDAR_MONTHS.ru

  function moveMonth(step) {
    setMonthView((current) => new Date(current.getFullYear(), current.getMonth() + step, 1))
  }

  function selectDate(dateValue) {
    onChange({ target: { name, value: formatInputDate(dateValue) } })
    setOpen(false)
  }

  return (
    <div className="calendar-field">
      <button
        ref={triggerRef}
        className={open ? 'calendar-trigger active' : 'calendar-trigger'}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value ? formatCalendarDisplay(value, lang) : placeholder}</span>
        <span className="calendar-trigger-icon">📅</span>
      </button>

      {open ? (
        <div className="calendar-popover" ref={popupRef}>
          <div className="calendar-head">
            <strong>{months[monthView.getMonth()]} {monthView.getFullYear()}</strong>
            <div className="calendar-nav">
              <button type="button" onClick={() => moveMonth(-1)}>‹</button>
              <button type="button" onClick={() => moveMonth(1)}>›</button>
            </div>
          </div>

          <div className="calendar-weekdays">
            {weekdays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {days.map((day) => {
              const inCurrentMonth = day.getMonth() === monthView.getMonth()
              const isSelected =
                parsedValue &&
                day.getFullYear() === parsedValue.getFullYear() &&
                day.getMonth() === parsedValue.getMonth() &&
                day.getDate() === parsedValue.getDate()

              return (
                <button
                  key={`${name}-${day.toISOString()}`}
                  type="button"
                  className={[
                    'calendar-day',
                    inCurrentMonth ? '' : 'muted',
                    isSelected ? 'selected' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => selectDate(day)}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

async function readJson(response) {
  const rawText = await response.text()
  if (!rawText) return {}
  return JSON.parse(rawText)
}

function TicketCard({ ticket, onToggleFavorite, favoritePending, lang }) {
  const t = TEXT[lang] || TEXT.ru
  const originLabel = translateLocationLabel(ticket.origin, ticket.origin_code, lang)
  const destinationLabel = translateLocationLabel(ticket.destination, ticket.destination_code, lang)
  const originAirportLabel = translateLocationLabel(ticket.origin_airport, ticket.origin_airport_code || ticket.origin_code, lang)
  const destinationAirportLabel = translateLocationLabel(ticket.destination_airport, ticket.destination_airport_code || ticket.destination_code, lang)
  const cityRoute = `${originLabel} → ${destinationLabel}`
  const airportRoute = originAirportLabel && destinationAirportLabel
    ? `${originAirportLabel} → ${destinationAirportLabel}`
    : cityRoute
  const airlineName = formatAirlineName(ticket.airline, lang)

  return (
    <article className="result-card">
      <div className="card-video-frame" aria-hidden="true">
        <video className="ticket-preview" src="/ticket-preview.mp4" muted loop playsInline preload="metadata" autoPlay />
      </div>
      <div className="card-video-overlay" aria-hidden="true" />

        <div className="result-top content-layer">
          <span className="result-source">{ticket.source}</span>
          <span className={ticket.estimated_price ? 'result-price estimated' : 'result-price'}>
            {`${ticket.price} RUB`}
          </span>
        </div>

      <strong className="route content-layer">{cityRoute}</strong>
      <p className="airport-route content-layer">{airportRoute}</p>
      {airlineName ? <p className="airline-name content-layer">{t.airline}: {airlineName}</p> : null}
      {ticket.baggage_info ? <p className="airline-name content-layer">{t.baggage}: {ticket.baggage_info}</p> : null}
      <p className="meta content-layer">{formatTransfers(ticket.transfers, lang)}</p>
      <p className="meta content-layer">{t.departure}: {formatDateTime(ticket.departure_at, lang)}</p>
      <div className="price-note content-layer">
        {ticket.estimated_price
          ? t.estimatedNote
          : t.exactNote}
      </div>

      <div className="card-actions content-layer">
        <button className={ticket.is_favorite ? 'favorite-button active' : 'favorite-button'} type="button" onClick={() => onToggleFavorite(ticket)} disabled={favoritePending}>
          {favoritePending ? '...' : ticket.is_favorite ? t.removeFavorite : t.addFavorite}
        </button>
        {ticket.link ? (
          <a className="ticket-link" href={ticket.link} target="_blank" rel="noreferrer">
            {t.openTicket}
          </a>
        ) : null}
      </div>
    </article>
  )
}

function SearchHistoryCard({ item, lang, onRepeat, onRemove, onOpenTickets, pendingDelete, removing }) {
  const t = TEXT[lang] || TEXT.ru
  const sourceLabel = SOURCE_OPTIONS.find((option) => option.value === item.source)?.label || item.source
  const routeParts = String(item.route || '').split(/\s[-–—]+\s/)
  const originCode = routeParts[0] || ''
  const destinationCode = routeParts[1] || ''
  const routeLabel = item.anywhere
    ? `${translateLocationLabel(originCode, originCode, lang)} → ${t.anywhere}`
    : `${translateLocationLabel(originCode, originCode, lang)} → ${translateLocationLabel(destinationCode, destinationCode, lang)}`
  const dateLabel = item.return_date
    ? `${item.date || t.noDate} - ${item.return_date}`
    : (item.date || t.noDate)
  const priceLabel = item.price_from != null || item.price_to != null
    ? `${item.price_from ?? 0} - ${item.price_to ?? '∞'} RUB`
    : '—'
  const countLabel = `${item.result_count ?? 0} ${lang === 'ru' ? 'билетов' : 'tickets'}`

  return (
    <article className={removing ? 'history-card removing' : 'history-card'}>
      <button
        className="history-remove"
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onRemove(item.id)
        }}
        disabled={pendingDelete}
        aria-label={t.removeHistoryItem}
        title={t.removeHistoryItem}
      >
        ×
      </button>
      <div className="history-card-top">
        <span className="result-source">{sourceLabel}</span>
        <span className="history-count">{countLabel}</span>
      </div>
      <h3>{routeLabel}</h3>
      <p>{dateLabel}</p>
      <p>{priceLabel}</p>
      <p>{formatDateTime(item.created_at || item.server_time, lang)}</p>
      <div className="history-card-actions">
        <button className="favorite-button active history-view" type="button" onClick={() => onOpenTickets(item)}>
          {t.viewTickets}
        </button>
      </div>
      <button className="favorite-button active history-repeat" type="button" onClick={() => onRepeat(item)}>
        {t.repeatSearch}
      </button>
    </article>
  )
}

function App() {
  const accountCornerRef = useRef(null)
  const today = new Date()
  const defaultStart = addDays(today, 1)
  const defaultDate = formatInputDate(defaultStart)
  const defaultRangeEnd = formatInputDate(addDays(defaultStart, 5))
  const [form, setForm] = useState({
    from: 'Москва',
    to: 'Сочи',
    routeMode: 'destination',
    date: defaultDate,
    rangeStart: defaultDate,
    rangeEnd: defaultRangeEnd,
    priceFrom: '',
    priceTo: '',
    airlineCode: '',
    searchMode: 'single',
    source: 'aviasales',
  })
  const [authForm, setAuthForm] = useState({ username: '', password: '' })
  const [authMode, setAuthMode] = useState('login')
  const [authUser, setAuthUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [lang, setLang] = useState(() => localStorage.getItem('airparser-lang') || 'ru')
  const [theme, setTheme] = useState(() => localStorage.getItem('airparser-theme') || 'light')
  const [tickets, setTickets] = useState([])
  const [favorites, setFavorites] = useState([])
  const [history, setHistory] = useState([])
  const [historyPendingId, setHistoryPendingId] = useState(null)
  const [historyRemovingIds, setHistoryRemovingIds] = useState([])
  const [historyTickets, setHistoryTickets] = useState([])
  const [historyTicketsTitle, setHistoryTicketsTitle] = useState('')
  const [openHistoryId, setOpenHistoryId] = useState(null)
  const [favoritePendingKey, setFavoritePendingKey] = useState('')
  const [sortCheapFirst, setSortCheapFirst] = useState(false)
  const [historySortCheapFirst, setHistorySortCheapFirst] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [serverTime, setServerTime] = useState('')
  const [scrollProgress, setScrollProgress] = useState(0)
  const t = TEXT[lang] || TEXT.ru
  const sourceOptions = useMemo(
    () => [
      { value: 'both', label: t.sourceBoth },
      { value: 'aviasales', label: 'Aviasales' },
      { value: 'tutu', label: 'Tutu.ru' },
      { value: 'kupibilet', label: 'Kupibilet' },
    ],
    [t]
  )
  const airlineOptions = useMemo(
    () => [
      { value: '', label: t.allAirlines },
      ...Object.entries(AIRLINE_LABELS).map(([value, labels]) => ({
        value,
        label: labels[lang] || labels.ru,
      })),
    ],
    [lang, t]
  )
  const navItems = useMemo(
    () => [
      { id: 'about-section', label: t.navAbout, icon: '◎' },
      { id: 'parser-section', label: t.navSearch, icon: '◌' },
      { id: 'favorites-section', label: t.navHistory, icon: '◍' },
      { id: 'output-section', label: t.navResults, icon: '▣' },
    ],
    [t]
  )

  const canSearch = useMemo(
    () => {
      const hasDestination = form.routeMode === 'anywhere' || form.to.trim()
      if (!authUser || !form.from.trim() || !hasDestination || !form.source.trim()) return false
      if (form.searchMode === 'range') {
        return form.rangeStart.trim() && form.rangeEnd.trim()
      }
      return form.date.trim()
    },
    [authUser, form]
  )
  const rangeDays = form.searchMode === 'range' ? getRangeDays(form.rangeStart, form.rangeEnd) : 0
  const displayedTickets = useMemo(() => sortTicketItems(tickets, sortCheapFirst), [tickets, sortCheapFirst])
  const displayedHistoryTickets = useMemo(() => sortTicketItems(historyTickets, historySortCheapFirst), [historyTickets, historySortCheapFirst])
  const visibleHistory = useMemo(() => history.filter((item) => (item.result_count ?? 0) > 0), [history])

  async function loadFavorites() {
    if (!authUser) {
      setFavorites([])
      return
    }

    const response = await fetch('/api/favorites', { credentials: 'include' })
    const payload = await readJson(response)
    if (!response.ok) {
      throw new Error(payload.error || t.favoriteFailed)
    }
    setFavorites(Array.isArray(payload.favorites) ? payload.favorites : [])
  }

  async function loadHistory() {
    if (!authUser) {
      setHistory([])
      return
    }

    const response = await fetch('/api/history', { credentials: 'include' })
    const payload = await readJson(response)
    if (!response.ok) {
      throw new Error(payload.error || t.searchFailed)
    }
    setHistory(Array.isArray(payload.history) ? payload.history : [])
  }

  async function loadHistoryTicketsById(historyId) {
    const response = await fetch('/api/history/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: historyId }),
    })
    const payload = await readJson(response)
    if (!response.ok) {
      throw new Error(payload.error || t.searchFailed)
    }
    return Array.isArray(payload.tickets) ? payload.tickets : []
  }

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' })
        const payload = await readJson(response)
        if (!active) return
        const user = payload.authenticated ? payload.user : null
        setAuthUser(user)
      } catch {
        if (!active) return
        setAuthUser(null)
      } finally {
        if (active) setAuthLoading(false)
      }
    }

    loadSession()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('airparser-lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    if (!accountOpen) return undefined

    function handlePointerDown(event) {
      if (!accountCornerRef.current?.contains(event.target)) {
        setAccountOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setAccountOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [accountOpen])

  useEffect(() => {
    localStorage.setItem('airparser-theme', theme)
  }, [theme])

  useEffect(() => {
    function updateTopbarState() {
      const documentHeight = document.documentElement.scrollHeight
      const viewportHeight = window.innerHeight
      const maxScroll = Math.max(documentHeight - viewportHeight, 1)
      const nextProgress = Math.min(window.scrollY / maxScroll, 1)
      setScrollProgress(nextProgress)
    }

    updateTopbarState()
    window.addEventListener('scroll', updateTopbarState, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateTopbarState)
    }
  }, [])

  useEffect(() => {
    if (!authUser) {
      setFavorites([])
      setHistory([])
      return
    }

    loadFavorites().catch(() => {
      setFavorites([])
    })
    loadHistory().catch(() => {
      setHistory([])
    })
  }, [authUser])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function toggleSearchMode(nextMode) {
    setForm((current) => ({
      ...current,
      searchMode: nextMode,
    }))
  }

  function toggleRouteMode(nextMode) {
    setForm((current) => ({
      ...current,
      routeMode: nextMode,
    }))
  }

  function updateAuthField(event) {
    const { name, value } = event.target
    setAuthForm((current) => ({ ...current, [name]: value }))
  }

  function toggleSource(nextSource) {
    setForm((current) => ({
      ...current,
      source: nextSource,
    }))
  }

  function handleToggleMainSort() {
    setSortCheapFirst((current) => !current)
  }

  function handleToggleHistorySort() {
    setHistorySortCheapFirst((current) => !current)
  }

  function applyFavoriteFlags(items, favoriteItems) {
    const favoriteKeys = new Set(favoriteItems.map((item) => item.ticket_key))
    return items.map((item) => ({ ...item, is_favorite: favoriteKeys.has(item.ticket_key) }))
  }

  async function submitAuth(event) {
    event.preventDefault()
    setAuthSubmitting(true)
    setAuthError('')

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(authForm),
      })

      const payload = await readJson(response)
      if (!response.ok) {
        throw new Error(payload.error || t.authFailed)
      }

      setAuthUser(payload.user)
      setAuthForm({ username: '', password: '' })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : t.authFailed
      setAuthError(message)
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleLogout() {
    setAuthSubmitting(true)
    setAuthError('')
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      setAuthUser(null)
      setTickets([])
      setFavorites([])
      setHistory([])
      setServerTime('')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleToggleFavorite(ticket) {
    if (!authUser || !ticket.ticket_key) return
    setFavoritePendingKey(ticket.ticket_key)

    try {
      const endpoint = ticket.is_favorite ? '/api/favorites/remove' : '/api/favorites/add'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(ticket.is_favorite ? { ticket_key: ticket.ticket_key } : ticket),
      })
      const payload = await readJson(response)
      if (!response.ok) {
        throw new Error(payload.error || t.favoriteFailed)
      }

      if (ticket.is_favorite) {
        const nextFavorites = favorites.filter((item) => item.ticket_key !== ticket.ticket_key)
        setFavorites(nextFavorites)
        setTickets((current) => current.map((item) => item.ticket_key === ticket.ticket_key ? { ...item, is_favorite: false } : item))
      } else {
        const added = payload.favorite
        const nextFavorites = [added, ...favorites.filter((item) => item.ticket_key !== added.ticket_key)]
        setFavorites(nextFavorites)
        setTickets((current) => current.map((item) => item.ticket_key === added.ticket_key ? { ...item, is_favorite: true } : item))
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : t.favoriteFailed
      setError(message)
    } finally {
      setFavoritePendingKey('')
    }
  }

  async function runSearch(searchForm) {
    setLoading(true)
    setError('')
    setTickets([])
    setServerTime('')
    scrollToSection('output-section')

    try {
      const route = searchForm.routeMode === 'anywhere'
        ? normalizeLocation(searchForm.from)
        : `${normalizeLocation(searchForm.from)} - ${normalizeLocation(searchForm.to)}`
      const dateValue = searchForm.searchMode === 'range' ? searchForm.rangeStart : searchForm.date
      const returnDateValue = searchForm.searchMode === 'range' ? searchForm.rangeEnd : null
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          route,
          anywhere: searchForm.routeMode === 'anywhere',
          date: dateValue || null,
          return_date: returnDateValue || null,
          price_from: searchForm.priceFrom || null,
          price_to: searchForm.priceTo || null,
          airline_code: searchForm.airlineCode || null,
          source: searchForm.source,
        }),
      })

      const payload = await readJson(response)
      if (!response.ok) {
        throw new Error(payload.error || t.searchFailed)
      }

      const nextTickets = Array.isArray(payload.tickets) ? payload.tickets : []
      let resolvedTickets = nextTickets
      if (resolvedTickets.length === 0 && payload.history_id) {
        try {
          resolvedTickets = await loadHistoryTicketsById(payload.history_id)
        } catch {
          resolvedTickets = nextTickets
        }
      }

      setTickets(applyFavoriteFlags(resolvedTickets, favorites))
      setServerTime(payload.server_time || '')
      if (authUser) {
        loadHistory().catch(() => {})
      }
    } catch (requestError) {
      setTickets([])
      setServerTime('')
      const message = requestError instanceof Error ? requestError.message : t.searchFailed
      if (message.includes('Failed to fetch')) {
        setError(t.backendError)
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveHistory(id) {
    setHistoryPendingId(id)
    setHistoryRemovingIds((current) => current.includes(id) ? current : [...current, id])
    try {
      const response = await fetch('/api/history/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      })
      const payload = await readJson(response)
        if (!response.ok) {
          throw new Error(payload.error || t.searchFailed)
        }
        setHistory((current) => current.filter((item) => item.id !== id))
        if (openHistoryId === id) {
          setOpenHistoryId(null)
          setHistoryTickets([])
          setHistoryTicketsTitle('')
        }
        window.setTimeout(() => {
          setHistory((current) => current.filter((item) => item.id !== id))
          setHistoryRemovingIds((current) => current.filter((value) => value !== id))
        }, 220)
      } catch (requestError) {
        setHistoryRemovingIds((current) => current.filter((value) => value !== id))
        const message = requestError instanceof Error ? requestError.message : t.searchFailed
        setError(message)
    } finally {
      setHistoryPendingId(null)
    }
  }

  async function handleOpenHistoryTickets(item) {
    if (openHistoryId === item.id) {
      setOpenHistoryId(null)
      setHistoryTickets([])
      setHistoryTicketsTitle('')
      return
    }

    try {
      const response = await fetch('/api/history/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: item.id }),
      })
      const payload = await readJson(response)
      if (!response.ok) {
        throw new Error(payload.error || t.searchFailed)
      }
      setHistoryTickets(Array.isArray(payload.tickets) ? payload.tickets : [])
      setHistoryTicketsTitle(item.route)
      setOpenHistoryId(item.id)
      setHistorySortCheapFirst(false)
      scrollToSection('history-tickets-section')
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : t.searchFailed
      setError(message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSearch) return
    await runSearch(form)
  }

  function handleRepeatSearch(item) {
    const [fromPart, toPart] = String(item.route || '').split(/\s[-–—]+\s/)
    const nextForm = {
      from: fromPart || form.from,
      to: item.anywhere ? '' : (toPart || form.to),
      routeMode: item.anywhere ? 'anywhere' : 'destination',
      searchMode: item.return_date ? 'range' : 'single',
      date: item.date || form.date,
      rangeStart: item.date || form.rangeStart,
      rangeEnd: item.return_date || form.rangeEnd,
      priceFrom: item.price_from != null ? String(item.price_from) : '',
      priceTo: item.price_to != null ? String(item.price_to) : '',
      airlineCode: item.airline_code || '',
      source: item.source || form.source,
    }
    setForm((current) => ({
      ...current,
      ...nextForm,
    }))
    runSearch(nextForm)
  }

  return (
    <div className={`app-shell ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <div className="aurora aurora-left" />
      <div className="aurora aurora-right" />
      <div className="aurora aurora-bottom" />

      <header
        className={scrollProgress > 0.02 ? 'topbar scrolled' : 'topbar'}
        style={{
          '--topbar-fill': `${Math.round(scrollProgress * 100)}%`,
          '--topbar-compact': scrollProgress.toFixed(3),
        }}
      >
        <button className="header__logo" type="button" onClick={() => scrollToSection('top-section')}>
          <strong>{t.navLogo}</strong>
        </button>

        <nav className="navbar" aria-label="Main navigation">
          <ul className="navbar__menu">
            {navItems.map((item) => (
              <li key={item.id} className="navbar__item">
                <button className="navbar__link" type="button" onClick={() => scrollToSection(item.id)}>
                  <span className="navbar__icon" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hero-account-corner" ref={accountCornerRef}>
          <div className="hero-top-controls">
            <button
              className="mini-control"
              type="button"
              onClick={() => setLang((current) => current === 'ru' ? 'en' : 'ru')}
              aria-label={lang === 'ru' ? 'Сменить язык' : 'Switch language'}
            >
              <span className="mini-control-label">{t.navLanguage}</span>
              <strong>{lang === 'ru' ? 'RU' : 'EN'}</strong>
            </button>
            <button
              className="mini-control"
              type="button"
              onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
              aria-label={lang === 'ru' ? 'Сменить тему' : 'Switch theme'}
            >
              <span className="mini-control-label">{t.navTheme}</span>
              <strong>{theme === 'dark' ? 'Light' : 'Dark'}</strong>
            </button>
            <button
              className={[
                'account-avatar',
                accountOpen ? 'active' : '',
                authUser ? 'logged-in' : '',
              ].filter(Boolean).join(' ')}
              type="button"
              onClick={() => setAccountOpen((current) => !current)}
              aria-label={lang === 'ru' ? 'Открыть аккаунт' : 'Open account'}
            >
              <span className="account-avatar-icon">◉</span>
              <span className="account-avatar-text">{t.navAccount}</span>
            </button>
          </div>

          {accountOpen ? (
            <div className="auth-card hero-auth-card">
              <div className="auth-header">
                <span className="section-kicker">{t.account}</span>
                {authUser ? <span className="auth-badge">{t.active}</span> : null}
              </div>

              {authLoading ? (
                <div className="status-box info">{t.checkingSession}</div>
              ) : authUser ? (
                <div className="auth-user-box">
                  <strong>{authUser.username}</strong>
                  <p>{t.accountAuthorized}</p>
                  <button className="auth-submit ghost" type="button" onClick={handleLogout} disabled={authSubmitting}>
                    {t.logout}
                  </button>
                </div>
              ) : (
                <>
                  <div className="auth-switcher">
                    <button className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'} type="button" onClick={() => setAuthMode('login')}>
                      {t.login}
                    </button>
                    <button className={authMode === 'register' ? 'auth-tab active' : 'auth-tab'} type="button" onClick={() => setAuthMode('register')}>
                      {t.register}
                    </button>
                  </div>

                  <form className="auth-form" onSubmit={submitAuth}>
                    <label className="field auth-field">
                      <span>{t.username}</span>
                      <input name="username" value={authForm.username} onChange={updateAuthField} placeholder={t.usernamePlaceholder} />
                    </label>

                    <label className="field auth-field">
                      <span>{t.password}</span>
                      <input name="password" type="password" value={authForm.password} onChange={updateAuthField} placeholder={t.passwordPlaceholder} />
                    </label>

                    {authError ? <div className="status-box error compact">{authError}</div> : null}

                    <button className="auth-submit" type="submit" disabled={authSubmitting}>
                      {authSubmitting ? t.pleaseWait : authMode === 'register' ? t.createAccount : t.signIn}
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : null}
        </div>
      </header>

      <section className="hero-screen" id="top-section">
        <div className="hero-shell">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">AirParser Platform</span>
            <h1>{t.heroTitle}</h1>
            <p>{t.heroText}</p>

            <div className="hero-actions">
              <button className="hero-button primary" type="button" onClick={() => scrollToSection('parser-section')}>
                {t.heroStart}
              </button>
              <button className="hero-button secondary" type="button" onClick={() => scrollToSection('about-section')}>
                {t.heroMore}
              </button>
            </div>

            <div className="hero-note">{t.heroNote}</div>
          </div>

          <div className="hero-visual">
            <div className="hero-visual-badge badge-top-left">{t.visualSource}</div>
            <div className="hero-visual-badge badge-center-right">{t.visualCalendar}</div>
            <div className="hero-visual-badge badge-bottom-left">{t.visualSearch}</div>
            <div className="visual-shape shape-large shape-a" />
            <div className="visual-shape shape-medium shape-b" />
            <div className="visual-shape shape-small shape-c" />
            <div className="visual-dots dots-top" />
            <div className="visual-dots dots-bottom" />
          </div>
        </div>
        </div>
      </section>

      <main className="layout">
        <section className="panel about-panel" id="about-section">
          <div className="panel-heading stacked">
            <span className="section-kicker">{t.about}</span>
            <h2>{t.aboutTitle}</h2>
            <p>{t.aboutText1}</p>
            <p>{t.aboutText2}</p>
          </div>
        </section>

        <section className="panel parser-panel" id="parser-section">
          <div className="book-shell">
            <div className="book-side book-copy">
              <span className="section-kicker">{t.launch}</span>
              <h2>{t.parserWindow}</h2>
              <p>{t.parserText}</p>
              <ul className="book-points">
                <li>{lang === 'ru' ? 'один маршрут вводится только один раз;' : 'the route is entered only once;'}</li>
                <li>{lang === 'ru' ? 'календарь открывается прямо по клику в полях даты;' : 'the calendar opens directly from the date fields;'}</li>
                <li>{lang === 'ru' ? 'можно переключаться между одним днем и диапазоном без отдельной страницы;' : 'you can switch between one day and a range without leaving the page;'}</li>
                <li>{lang === 'ru' ? 'при включении режима "хоть куда" направление назначения отключается;' : 'when "Anywhere" is enabled, the destination field is disabled;'}</li>
                <li>{lang === 'ru' ? 'при желании выдачу можно ограничить диапазоном цены;' : 'the result set can be limited by a price range;'}</li>
                <li>{lang === 'ru' ? 'одновременно можно запускать только один парсер, чтобы не создавать лишнюю нагрузку.' : 'only one parser can run at a time to avoid extra load.'}</li>
              </ul>
              {!authUser ? <div className="status-box muted">{t.loginFirst}</div> : null}
            </div>

            <div className="book-side book-form-wrap">
              <form className="search-form" onSubmit={handleSubmit}>
                <label className="field wide">
                  <span>{t.from}</span>
                  <input name="from" list="cis-city-suggestions" value={form.from} onChange={updateField} placeholder={t.fromPlaceholder} />
                </label>

                <label className="field wide">
                  <span>{t.to}</span>
                  <input
                    name="to"
                    list="cis-city-suggestions"
                    value={form.to}
                    onChange={updateField}
                    placeholder={t.toPlaceholder}
                    disabled={form.routeMode === 'anywhere'}
                    className={form.routeMode === 'anywhere' ? 'disabled-input' : ''}
                  />
                </label>

                <datalist id="cis-city-suggestions">
                  {CITY_AUTOCOMPLETE_OPTIONS.map((option) => (
                    <option key={`${option.value}-${option.label}`} value={option.value} label={option.label} />
                  ))}
                </datalist>

                <div className="route-mode-box">
                  <span className="parser-choice-label">{t.routeLogic}</span>
                  <p className="parser-choice-description">{t.routeText}</p>
                  <div className="date-mode-checks">
                    <label className={form.routeMode === 'destination' ? 'parser-check active' : 'parser-check'}>
                      <input type="checkbox" checked={form.routeMode === 'destination'} onChange={() => toggleRouteMode('destination')} />
                      <span>{t.exactRoute}</span>
                    </label>
                    <label className={form.routeMode === 'anywhere' ? 'parser-check active' : 'parser-check'}>
                      <input type="checkbox" checked={form.routeMode === 'anywhere'} onChange={() => toggleRouteMode('anywhere')} />
                      <span>{t.anywhere}</span>
                    </label>
                  </div>
                </div>

                <div className="date-mode-layout">
                  <div className="date-mode-fields">
                    {form.searchMode === 'single' ? (
                      <label className="field single-date-field">
                        <span>{t.departureDate}</span>
                        <CalendarField
                          name="date"
                          value={form.date}
                          onChange={updateField}
                          lang={lang}
                          placeholder={t.noDate}
                        />
                      </label>
                    ) : (
                      <div className="range-fields">
                        <label className="field">
                          <span>{t.dateFrom}</span>
                          <CalendarField
                            name="rangeStart"
                            value={form.rangeStart}
                            onChange={updateField}
                            lang={lang}
                            placeholder={t.noDate}
                          />
                        </label>

                        <label className="field">
                          <span>{t.dateTo}</span>
                          <CalendarField
                            name="rangeEnd"
                            value={form.rangeEnd}
                            onChange={updateField}
                            lang={lang}
                            placeholder={t.noDate}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="date-mode-switcher">
                    <span className="parser-choice-label">{t.calendarLogic}</span>
                    <p className="parser-choice-description">{t.calendarText}</p>
                    <div className="date-mode-checks">
                      <label className={form.searchMode === 'single' ? 'parser-check active' : 'parser-check'}>
                        <input type="checkbox" checked={form.searchMode === 'single'} onChange={() => toggleSearchMode('single')} />
                        <span>{t.oneDay}</span>
                      </label>
                      <label className={form.searchMode === 'range' ? 'parser-check active' : 'parser-check'}>
                        <input type="checkbox" checked={form.searchMode === 'range'} onChange={() => toggleSearchMode('range')} />
                        <span>{t.dateRange}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="range-fields price-fields">
                  <label className="field">
                    <span>{t.priceFrom}</span>
                    <input name="priceFrom" type="number" min="0" value={form.priceFrom} onChange={updateField} placeholder={lang === 'ru' ? 'Например, 5000' : 'For example, 5000'} />
                  </label>

                  <label className="field">
                    <span>{t.priceTo}</span>
                    <input name="priceTo" type="number" min="0" value={form.priceTo} onChange={updateField} placeholder={lang === 'ru' ? 'Например, 20000' : 'For example, 20000'} />
                  </label>
                </div>

                <label className="field wide">
                  <span>{t.airline}</span>
                  <select name="airlineCode" value={form.airlineCode} onChange={updateField} className="select-field">
                    {airlineOptions.map((option) => (
                      <option key={option.value || 'all-airlines'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="parser-choice">
                  <span className="parser-choice-label">{t.parserChoice}</span>
                  <p className="parser-choice-description">{t.parserChoiceText}</p>
                  <div className="parser-choice-grid">
                    {sourceOptions.map((option) => (
                      <label key={option.value} className={form.source === option.value ? 'parser-check active' : 'parser-check'}>
                        <input
                          type="checkbox"
                          checked={form.source === option.value}
                          onChange={() => toggleSource(option.value)}
                          disabled={form.routeMode === 'anywhere' && option.value !== 'aviasales'}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button className="search-button" type="submit" disabled={!canSearch || loading}>
                  {loading
                    ? form.searchMode === 'range'
                      ? t.searchingRange
                      : t.searchingDate
                    : authUser
                      ? t.findTickets
                      : t.loginToSearch}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="panel favorites-panel" id="favorites-section">
          <div className="panel-heading results-heading">
            <div>
              <span className="section-kicker">{t.history}</span>
              <h2>{t.searchHistory}</h2>
            </div>
            <p>{t.historyUser}</p>
          </div>

          {!authUser ? <div className="status-box muted">{t.favoritesAvailable}</div> : null}
          {authUser && visibleHistory.length === 0 ? <div className="status-box muted">{t.noHistory}</div> : null}

            <div className="results-grid history-grid">
              {visibleHistory.map((item) => (
                <SearchHistoryCard
                  key={`history-${item.id}`}
                  item={item}
                  lang={lang}
                  onRepeat={handleRepeatSearch}
                  onRemove={handleRemoveHistory}
                  onOpenTickets={handleOpenHistoryTickets}
                  pendingDelete={historyPendingId === item.id}
                  removing={historyRemovingIds.includes(item.id)}
                />
              ))}
            </div>

            {historyTickets.length > 0 ? (
              <div className="history-tickets-block" id="history-tickets-section">
                <div className="panel-heading results-heading compact">
                  <div>
                    <span className="section-kicker">{t.history}</span>
                    <h2>{t.historyTicketsTitle}</h2>
                  </div>
                  <p>{historyTicketsTitle}</p>
                </div>
                <div className="results-toolbar">
                  <button
                    className={historySortCheapFirst ? 'parser-check active sort-check sort-button' : 'parser-check sort-check sort-button'}
                    type="button"
                    onClick={handleToggleHistorySort}
                    aria-pressed={historySortCheapFirst}
                  >
                    <span className="sort-button-mark">{historySortCheapFirst ? '✓' : ''}</span>
                    <span>{t.sortToggle}: {t.sortCheapFirst}</span>
                  </button>
                </div>
                <div className="results-grid">
                  {displayedHistoryTickets.map((ticket, index) => (
                    <TicketCard
                      key={buildRenderTicketKey(ticket, index, 'history-ticket')}
                      ticket={ticket}
                      onToggleFavorite={handleToggleFavorite}
                      favoritePending={favoritePendingKey === ticket.ticket_key}
                      lang={lang}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>

        <section className="panel favorites-panel">
          <div className="panel-heading results-heading">
            <div>
              <span className="section-kicker">{t.favorites}</span>
              <h2>{t.savedTickets}</h2>
            </div>
            <p>{authUser ? t.favoritesUser : t.favoritesNeedLogin}</p>
          </div>

          {!authUser ? <div className="status-box muted">{t.favoritesAvailable}</div> : null}
          {authUser && favorites.length === 0 ? <div className="status-box muted">{t.noFavorites}</div> : null}

          <div className="results-grid">
            {favorites.map((ticket, index) => (
              <TicketCard key={buildRenderTicketKey(ticket, index, 'favorite-ticket')} ticket={{ ...ticket, is_favorite: true }} onToggleFavorite={handleToggleFavorite} favoritePending={favoritePendingKey === ticket.ticket_key} lang={lang} />
            ))}
          </div>
        </section>

        <section className="panel output-panel" id="output-section">
          <div className="panel-heading results-heading">
            <div>
              <span className="section-kicker">{t.results}</span>
              <h2>{t.parserOutput}</h2>
            </div>
            {serverTime ? <p>{t.updated}: {formatDateTime(serverTime, lang)}</p> : <p>{t.outputHint}</p>}
          </div>

          <div className="results-toolbar">
            <button
              className={sortCheapFirst ? 'parser-check active sort-check sort-button' : 'parser-check sort-check sort-button'}
              type="button"
              onClick={handleToggleMainSort}
              aria-pressed={sortCheapFirst}
              disabled={loading}
            >
              <span className="sort-button-mark">{sortCheapFirst ? '✓' : ''}</span>
              <span>{t.sortToggle}: {t.sortCheapFirst}</span>
            </button>
          </div>

          {error ? <div className="status-box error">{error}</div> : null}
          {loading ? (
            <div className="loading-panel">
              <div className="loading-head">
                <span className="loading-pulse" />
                <strong>
                  {form.searchMode === 'range'
                    ? t.loadingRange
                    : t.loadingDate}
                </strong>
              </div>
              <p>
                {form.source === 'both'
                  ? t.loadingBoth
                  : t.loadingSource(sourceOptions.find((option) => option.value === form.source)?.label || form.source)}
              </p>
              {form.searchMode === 'range' && rangeDays > 21 ? <p>{t.loadingLongRange}</p> : null}
              <div className="loading-progress">
                <div className="loading-progress-bar" />
              </div>
              <div className="loading-steps">
                <span>{t.loadingStepCollect}</span>
                <span>{t.loadingStepFilter}</span>
                <span>{t.loadingStepBuild}</span>
              </div>
              <div className="loading-skeletons" aria-hidden="true">
                <div className="loading-skeleton-card" />
                <div className="loading-skeleton-card" />
                <div className="loading-skeleton-card" />
              </div>
            </div>
          ) : null}
          {!loading && !error && displayedTickets.length === 0 ? <div className="status-box muted">{t.noResults}</div> : null}

          <div className="results-grid">
            {displayedTickets.map((ticket, index) => (
              <TicketCard key={buildRenderTicketKey(ticket, index, 'search-ticket')} ticket={ticket} onToggleFavorite={handleToggleFavorite} favoritePending={favoritePendingKey === ticket.ticket_key} lang={lang} />
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-copy">
            <strong>{t.footerBrand}</strong>
            <p>{t.footerText}</p>
          </div>
          <span className="site-footer-meta">© 2026 {t.footerCopy}</span>
        </div>
      </footer>
    </div>
  )
}

export default App



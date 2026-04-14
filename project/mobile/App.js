import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from './src/api';
import { API_BASE_URL, APP_TITLE } from './src/config';
import { buildRoute, formatDateTime, formatPrice, sourceLabel, transfersLabel } from './src/helpers';
import { themes } from './src/theme';

const tabs = ['search', 'results', 'history', 'favorites', 'account'];

const tabLabels = {
  search: 'Поиск',
  results: 'Результаты',
  history: 'История',
  favorites: 'Избранное',
  account: 'Аккаунт',
};

const defaultSearch = {
  from: '',
  to: '',
  routeMode: 'exact',
  searchMode: 'oneDay',
  date: '',
  rangeStart: '',
  rangeEnd: '',
  priceFrom: '',
  priceTo: '',
  airlineCode: '',
  source: 'both',
};

function Btn({ label, onPress, theme, secondary = false, disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: secondary ? theme.panelStrong : theme.accentStrong,
          borderColor: secondary ? theme.border : theme.accent,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        },
      ]}
    >
      <Text style={[styles.btnText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function Input({ label, theme, ...props }) {
  return (
    <View style={styles.stack8}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.muted}
        style={[
          styles.input,
          {
            backgroundColor: theme.panelStrong,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        {...props}
      />
    </View>
  );
}

function Segments({ value, onChange, options, theme }) {
  return (
    <View style={[styles.segmentWrap, { backgroundColor: theme.panelStrong, borderColor: theme.border }]}>
      {options.map((item) => {
        const active = value === item.value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={[
              styles.segment,
              {
                backgroundColor: active ? theme.accentStrong : 'transparent',
                borderColor: active ? theme.accent : 'transparent',
              },
            ]}
          >
            <Text style={[styles.segmentText, { color: active ? '#f8fbff' : theme.muted }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TicketCard({ ticket, onFavorite, pendingKey, theme }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.badge, { color: theme.accent, backgroundColor: theme.panelStrong }]}>{sourceLabel(ticket.source)}</Text>
        <Text style={[styles.price, { color: theme.accentStrong }]}>{formatPrice(ticket.price)}</Text>
      </View>
      <Text style={[styles.title, { color: theme.text }]}>
        {ticket.origin} {'->'} {ticket.destination}
      </Text>
      <Text style={[styles.meta, { color: theme.muted }]}>Авиакомпания: {ticket.airline || 'Не указана'}</Text>
      <Text style={[styles.meta, { color: theme.muted }]}>{transfersLabel(ticket.transfers || 0)}</Text>
      <Text style={[styles.meta, { color: theme.muted }]}>Вылет: {formatDateTime(ticket.departure_at)}</Text>
      {!!ticket.baggage_info && (
        <View style={[styles.noteBox, { backgroundColor: theme.panelStrong, borderColor: theme.border }]}>
          <Text style={[styles.noteText, { color: theme.text }]}>Багаж и тариф: {ticket.baggage_info}</Text>
        </View>
      )}
      {ticket.estimated_price ? (
        <View style={[styles.noteBox, { backgroundColor: theme.panelStrong, borderColor: theme.border }]}>
          <Text style={[styles.noteText, { color: theme.muted }]}>
            Для режима "Хоть куда" цена ориентировочная.
          </Text>
        </View>
      ) : null}
      <View style={styles.stack10}>
        <Btn
          label={ticket.is_favorite ? 'Убрать из избранного' : 'В избранное'}
          onPress={() => onFavorite(ticket)}
          theme={theme}
          secondary
          disabled={pendingKey === ticket.ticket_key}
        />
        <Btn label="Открыть билет" onPress={() => ticket.link && Linking.openURL(ticket.link)} theme={theme} disabled={!ticket.link} />
      </View>
    </View>
  );
}

export default function App() {
  const [themeMode, setThemeMode] = useState('dark');
  const theme = useMemo(() => themes[themeMode], [themeMode]);
  const [activeTab, setActiveTab] = useState('search');
  const [authMode, setAuthMode] = useState('login');
  const [authUser, setAuthUser] = useState(null);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [searchForm, setSearchForm] = useState(defaultSearch);
  const [tickets, setTickets] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyTickets, setHistoryTickets] = useState([]);
  const [historyTitle, setHistoryTitle] = useState('');
  const [serverTime, setServerTime] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [favoritePendingKey, setFavoritePendingKey] = useState('');
  const [historyPendingId, setHistoryPendingId] = useState(null);
  const [sortCheapFirst, setSortCheapFirst] = useState(true);

  useEffect(() => {
    let active = true;
    api.authMe()
      .then((payload) => {
        if (active) setAuthUser(payload.authenticated ? payload.user : null);
      })
      .catch(() => {
        if (active) setAuthUser(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authUser) {
      setFavorites([]);
      setHistory([]);
      return;
    }
    api.favorites().then((payload) => setFavorites(payload.favorites || [])).catch(() => {});
    api.history().then((payload) => setHistory(payload.history || [])).catch(() => {});
  }, [authUser]);

  const visibleHistory = useMemo(() => history.filter((item) => Number(item.result_count || 0) > 0), [history]);
  const shownTickets = useMemo(() => {
    if (!sortCheapFirst) return tickets;
    return [...tickets].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  }, [sortCheapFirst, tickets]);

  function patchSearch(name, value) {
    setSearchForm((current) => ({ ...current, [name]: value }));
  }

  function withFavoriteFlags(items, favoritesList = favorites) {
    const keys = new Set(favoritesList.map((item) => item.ticket_key));
    return (items || []).map((item) => ({ ...item, is_favorite: keys.has(item.ticket_key) }));
  }

  async function refreshLists() {
    if (!authUser) return;
    const [favPayload, historyPayload] = await Promise.all([api.favorites(), api.history()]);
    setFavorites(favPayload.favorites || []);
    setHistory(historyPayload.history || []);
  }

  async function submitAuth() {
    setAuthSubmitting(true);
    setError('');
    try {
      const payload = authMode === 'login' ? await api.login(authForm) : await api.register(authForm);
      setAuthUser(payload.user);
      setAuthForm({ username: '', password: '' });
      setInfo(authMode === 'login' ? 'Вход выполнен.' : 'Аккаунт создан.');
      setActiveTab('search');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ошибка авторизации');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function logout() {
    setAuthSubmitting(true);
    try {
      await api.logout();
      setAuthUser(null);
      setTickets([]);
      setFavorites([]);
      setHistory([]);
      setHistoryTickets([]);
      setHistoryTitle('');
      setInfo('Сессия завершена.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось выйти');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function runSearch() {
    if (!authUser) {
      setActiveTab('account');
      setError('Сначала войди в аккаунт.');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    setTickets([]);
    setActiveTab('results');
    try {
      const anywhere = searchForm.routeMode === 'anywhere';
      const payload = await api.search({
        route: buildRoute({ from: searchForm.from, to: searchForm.to, anywhere }),
        anywhere,
        date: searchForm.searchMode === 'range' ? searchForm.rangeStart || null : searchForm.date || null,
        return_date: searchForm.searchMode === 'range' ? searchForm.rangeEnd || null : null,
        price_from: searchForm.priceFrom || null,
        price_to: searchForm.priceTo || null,
        airline_code: searchForm.airlineCode || null,
        source: anywhere ? 'aviasales' : searchForm.source,
      });
      const nextTickets = withFavoriteFlags(payload.tickets || []);
      setTickets(nextTickets);
      setServerTime(payload.server_time || '');
      setInfo(nextTickets.length ? `Найдено билетов: ${nextTickets.length}` : 'Билеты не найдены.');
      await refreshLists().catch(() => {});
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ошибка поиска');
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite(ticket) {
    if (!authUser || !ticket.ticket_key) return;
    setFavoritePendingKey(ticket.ticket_key);
    try {
      if (ticket.is_favorite) {
        await api.removeFavorite(ticket.ticket_key);
        setFavorites((current) => current.filter((item) => item.ticket_key !== ticket.ticket_key));
        setTickets((current) => current.map((item) => item.ticket_key === ticket.ticket_key ? { ...item, is_favorite: false } : item));
        setHistoryTickets((current) => current.map((item) => item.ticket_key === ticket.ticket_key ? { ...item, is_favorite: false } : item));
      } else {
        const payload = await api.addFavorite(ticket);
        setFavorites((current) => [payload.favorite, ...current.filter((item) => item.ticket_key !== payload.favorite.ticket_key)]);
        setTickets((current) => current.map((item) => item.ticket_key === payload.favorite.ticket_key ? { ...item, is_favorite: true } : item));
        setHistoryTickets((current) => current.map((item) => item.ticket_key === payload.favorite.ticket_key ? { ...item, is_favorite: true } : item));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ошибка избранного');
    } finally {
      setFavoritePendingKey('');
    }
  }

  async function openHistory(item) {
    setHistoryPendingId(item.id);
    try {
      const payload = await api.historyTickets(item.id);
      setHistoryTickets(withFavoriteFlags(payload.tickets || []));
      setHistoryTitle(item.route);
      setServerTime(payload.server_time || '');
      setActiveTab('history');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось открыть историю');
    } finally {
      setHistoryPendingId(null);
    }
  }

  async function removeHistory(id) {
    setHistoryPendingId(id);
    try {
      await api.removeHistory(id);
      setHistory((current) => current.filter((item) => item.id !== id));
      if (historyTitle) {
        setHistoryTitle('');
        setHistoryTickets([]);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось удалить запись');
    } finally {
      setHistoryPendingId(null);
    }
  }

  function repeatHistory(item) {
    const anywhere = Boolean(item.anywhere);
    let from = item.route;
    let to = '';
    if (!anywhere && item.route.includes(' - ')) {
      const parts = item.route.split(' - ');
      from = parts[0] || '';
      to = parts[1] || '';
    }
    setSearchForm({
      from,
      to,
      routeMode: anywhere ? 'anywhere' : 'exact',
      searchMode: item.return_date ? 'range' : 'oneDay',
      date: item.return_date ? '' : item.date || '',
      rangeStart: item.return_date ? item.date || '' : '',
      rangeEnd: item.return_date ? item.return_date || '' : '',
      priceFrom: item.price_from == null ? '' : String(item.price_from),
      priceTo: item.price_to == null ? '' : String(item.price_to),
      airlineCode: item.airline_code || '',
      source: item.source || 'both',
    });
    setActiveTab('search');
    setInfo('Поля заполнены из истории.');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.app}>
            <View style={[styles.panel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
              <Text style={[styles.brand, { color: theme.text }]}>{APP_TITLE}</Text>
              <Text style={[styles.subtext, { color: theme.muted }]}>Отдельный React Native клиент под телефон.</Text>
              <Text style={[styles.apiLine, { color: theme.muted }]}>API: {API_BASE_URL}</Text>
            </View>

            <View style={[styles.panel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.section, { color: theme.text }]}>Навигация</Text>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchText, { color: theme.muted }]}>{themeMode === 'dark' ? 'Dark' : 'Light'}</Text>
                  <Switch
                    value={themeMode === 'light'}
                    onValueChange={(value) => setThemeMode(value ? 'light' : 'dark')}
                    trackColor={{ false: theme.border, true: theme.accent }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>
              <View style={styles.stack10}>
                {tabs.map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <Pressable
                      key={tab}
                      onPress={() => setActiveTab(tab)}
                      style={[
                        styles.navBtn,
                        {
                          backgroundColor: active ? theme.accentStrong : theme.panelStrong,
                          borderColor: active ? theme.accent : theme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.navBtnText, { color: active ? '#f8fbff' : theme.text }]}>{tabLabels[tab]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={[styles.accountState, { backgroundColor: theme.panelStrong, borderColor: authUser ? theme.success : theme.border }]}>
                <View style={[styles.dot, { backgroundColor: authUser ? theme.success : theme.muted }]} />
                <Text style={[styles.accountStateText, { color: authUser ? theme.success : theme.muted }]}>
                  {authUser ? `Вошёл: ${authUser.username}` : 'Аккаунт не авторизован'}
                </Text>
              </View>
            </View>

            {error ? (
              <View style={[styles.alert, { backgroundColor: theme.panel, borderColor: theme.danger }]}>
                <Text style={[styles.alertText, { color: theme.text }]}>{error}</Text>
              </View>
            ) : null}

            {info ? (
              <View style={[styles.alert, { backgroundColor: theme.panel, borderColor: theme.success }]}>
                <Text style={[styles.alertText, { color: theme.text }]}>{info}</Text>
              </View>
            ) : null}

            {checkingSession ? (
              <View style={[styles.loader, { backgroundColor: theme.panel, borderColor: theme.border }]}>
                <ActivityIndicator color={theme.accent} />
                <Text style={[styles.subtext, { color: theme.muted }]}>Проверяем сессию пользователя...</Text>
              </View>
            ) : null}

            {activeTab === 'search' ? (
              <View style={[styles.panel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
                <Text style={[styles.section, { color: theme.text }]}>Поиск билетов</Text>
                <Input label="Откуда" value={searchForm.from} onChangeText={(v) => patchSearch('from', v)} placeholder="Москва / Moscow" theme={theme} />
                <Input label="Куда" value={searchForm.to} onChangeText={(v) => patchSearch('to', v)} placeholder="Сочи / Sochi" editable={searchForm.routeMode !== 'anywhere'} theme={theme} />
                <Text style={[styles.label, { color: theme.muted }]}>Логика направления</Text>
                <Segments
                  value={searchForm.routeMode}
                  onChange={(v) => patchSearch('routeMode', v)}
                  options={[
                    { value: 'exact', label: 'Точный маршрут' },
                    { value: 'anywhere', label: 'Хоть куда' },
                  ]}
                  theme={theme}
                />
                <Text style={[styles.label, { color: theme.muted }]}>Режим даты</Text>
                <Segments
                  value={searchForm.searchMode}
                  onChange={(v) => patchSearch('searchMode', v)}
                  options={[
                    { value: 'oneDay', label: 'Один день' },
                    { value: 'range', label: 'Диапазон' },
                  ]}
                  theme={theme}
                />
                {searchForm.searchMode === 'oneDay' ? (
                  <Input label="Дата вылета" value={searchForm.date} onChangeText={(v) => patchSearch('date', v)} placeholder="YYYY-MM-DD" theme={theme} />
                ) : (
                  <>
                    <Input label="Дата с" value={searchForm.rangeStart} onChangeText={(v) => patchSearch('rangeStart', v)} placeholder="YYYY-MM-DD" theme={theme} />
                    <Input label="Дата по" value={searchForm.rangeEnd} onChangeText={(v) => patchSearch('rangeEnd', v)} placeholder="YYYY-MM-DD" theme={theme} />
                  </>
                )}
                <Input label="Цена от" value={searchForm.priceFrom} onChangeText={(v) => patchSearch('priceFrom', v)} keyboardType="numeric" placeholder="0" theme={theme} />
                <Input label="Цена до" value={searchForm.priceTo} onChangeText={(v) => patchSearch('priceTo', v)} keyboardType="numeric" placeholder="20000" theme={theme} />
                <Input label="Код авиакомпании" value={searchForm.airlineCode} onChangeText={(v) => patchSearch('airlineCode', v.toUpperCase())} placeholder="SU" theme={theme} />
                <Text style={[styles.label, { color: theme.muted }]}>Источник</Text>
                <Segments
                  value={searchForm.routeMode === 'anywhere' ? 'aviasales' : searchForm.source}
                  onChange={(v) => patchSearch('source', v)}
                  options={[
                    { value: 'both', label: 'Все' },
                    { value: 'aviasales', label: 'Aviasales' },
                    { value: 'tutu', label: 'Tutu' },
                    { value: 'kupibilet', label: 'Kupi' },
                  ]}
                  theme={theme}
                />
                <Btn label={loading ? 'Ищем...' : authUser ? 'Найти билеты' : 'Войдите для поиска'} onPress={runSearch} theme={theme} disabled={loading || !authUser} />
              </View>
            ) : null}

            {activeTab === 'results' ? (
              <View style={[styles.panel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.section, { color: theme.text }]}>Результаты</Text>
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchText, { color: loading ? theme.muted : theme.text }]}>Дешевле сверху</Text>
                    <Switch
                      value={sortCheapFirst}
                      onValueChange={setSortCheapFirst}
                      disabled={loading}
                      trackColor={{ false: theme.border, true: theme.accent }}
                      thumbColor="#ffffff"
                    />
                  </View>
                </View>
                {serverTime ? <Text style={[styles.subtext, { color: theme.muted }]}>Обновлено: {formatDateTime(serverTime)}</Text> : null}
                {loading ? (
                  <View style={[styles.loader, { backgroundColor: theme.panelStrong, borderColor: theme.border }]}>
                    <ActivityIndicator color={theme.accent} />
                    <Text style={[styles.subtext, { color: theme.muted }]}>Собираем билеты из источников...</Text>
                  </View>
                ) : shownTickets.length ? (
                  shownTickets.map((ticket) => (
                    <TicketCard key={ticket.ticket_key} ticket={ticket} onFavorite={toggleFavorite} pendingKey={favoritePendingKey} theme={theme} />
                  ))
                ) : (
                  <View style={[styles.empty, { backgroundColor: theme.panelStrong, borderColor: theme.border }]}>
                    <Text style={[styles.subtext, { color: theme.muted }]}>Пока нет результатов. Запусти поиск выше.</Text>
                  </View>
                )}
              </View>
            ) : null}

            {activeTab === 'history' ? (
              <View style={[styles.panel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
                <Text style={[styles.section, { color: theme.text }]}>История поиска</Text>
                {!authUser ? (
                  <View style={[styles.empty, { backgroundColor: theme.panelStrong, borderColor: theme.border }]}>
                    <Text style={[styles.subtext, { color: theme.muted }]}>Сначала войди в аккаунт.</Text>
                  </View>
                ) : null}
                {authUser && !visibleHistory.length ? (
                  <View style={[styles.empty, { backgroundColor: theme.panelStrong, borderColor: theme.border }]}>
                    <Text style={[styles.subtext, { color: theme.muted }]}>История пока пуста.</Text>
                  </View>
                ) : null}
                {authUser && visibleHistory.map((item) => (
                  <View key={item.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.badge, { color: theme.accent, backgroundColor: theme.panelStrong }]}>{sourceLabel(item.source)}</Text>
                      <Text style={[styles.meta, { color: theme.muted }]}>{item.result_count} билетов</Text>
                    </View>
                    <Text style={[styles.title, { color: theme.text }]}>{item.route}</Text>
                    <Text style={[styles.meta, { color: theme.muted }]}>{item.date || 'Дата не указана'}{item.return_date ? ` - ${item.return_date}` : ''}</Text>
                    <Text style={[styles.meta, { color: theme.muted }]}>{item.price_from ?? 0} - {item.price_to ?? '∞'} RUB</Text>
                    <Text style={[styles.meta, { color: theme.muted }]}>{formatDateTime(item.created_at)}</Text>
                    <View style={styles.stack10}>
                      <Btn label="Посмотреть билеты" onPress={() => openHistory(item)} theme={theme} disabled={historyPendingId === item.id} />
                      <Btn label="Повторить поиск" onPress={() => repeatHistory(item)} theme={theme} secondary disabled={historyPendingId === item.id} />
                      <Btn label="Удалить" onPress={() => removeHistory(item.id)} theme={theme} secondary disabled={historyPendingId === item.id} />
                    </View>
                  </View>
                ))}
                {historyTitle ? (
                  <View style={[styles.innerPanel, { backgroundColor: theme.panelStrong, borderColor: theme.border }]}>
                    <Text style={[styles.section, { color: theme.text }]}>{historyTitle}</Text>
                    {historyTickets.length ? historyTickets.map((ticket) => (
                      <TicketCard key={ticket.ticket_key} ticket={ticket} onFavorite={toggleFavorite} pendingKey={favoritePendingKey} theme={theme} />
                    )) : <Text style={[styles.subtext, { color: theme.muted }]}>В этой записи нет сохранённых билетов.</Text>}
                  </View>
                ) : null}
              </View>
            ) : null}

            {activeTab === 'favorites' ? (
              <View style={[styles.panel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
                <Text style={[styles.section, { color: theme.text }]}>Избранное</Text>
                {!authUser ? (
                  <View style={[styles.empty, { backgroundColor: theme.panelStrong, borderColor: theme.border }]}>
                    <Text style={[styles.subtext, { color: theme.muted }]}>Войди в аккаунт, чтобы сохранять билеты.</Text>
                  </View>
                ) : favorites.length ? favorites.map((ticket) => (
                  <TicketCard key={ticket.ticket_key} ticket={ticket} onFavorite={toggleFavorite} pendingKey={favoritePendingKey} theme={theme} />
                )) : (
                  <View style={[styles.empty, { backgroundColor: theme.panelStrong, borderColor: theme.border }]}>
                    <Text style={[styles.subtext, { color: theme.muted }]}>Пока нет сохранённых билетов.</Text>
                  </View>
                )}
              </View>
            ) : null}

            {activeTab === 'account' ? (
              <View style={[styles.panel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
                <Text style={[styles.section, { color: theme.text }]}>Аккаунт</Text>
                {authUser ? (
                  <>
                    <View style={[styles.innerPanel, { backgroundColor: theme.panelStrong, borderColor: theme.border }]}>
                      <Text style={[styles.title, { color: theme.text }]}>{authUser.username}</Text>
                      <Text style={[styles.subtext, { color: theme.muted }]}>Аккаунт активен.</Text>
                    </View>
                    <Btn label={authSubmitting ? 'Выходим...' : 'Выйти'} onPress={logout} theme={theme} secondary disabled={authSubmitting} />
                  </>
                ) : (
                  <>
                    <Segments
                      value={authMode}
                      onChange={setAuthMode}
                      options={[
                        { value: 'login', label: 'Вход' },
                        { value: 'register', label: 'Регистрация' },
                      ]}
                      theme={theme}
                    />
                    <Input label="Логин" value={authForm.username} onChangeText={(v) => setAuthForm((c) => ({ ...c, username: v }))} placeholder="Введите логин" theme={theme} />
                    <Input label="Пароль" value={authForm.password} onChangeText={(v) => setAuthForm((c) => ({ ...c, password: v }))} placeholder="Введите пароль" secureTextEntry theme={theme} />
                    <Btn label={authSubmitting ? 'Подождите...' : authMode === 'login' ? 'Войти' : 'Создать аккаунт'} onPress={submitAuth} theme={theme} disabled={authSubmitting} />
                  </>
                )}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  app: { padding: 16, gap: 16 },
  panel: { borderWidth: 1, borderRadius: 24, padding: 16, gap: 14 },
  innerPanel: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchText: { fontSize: 13, fontWeight: '700' },
  brand: { fontSize: 28, fontWeight: '800' },
  section: { fontSize: 24, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  subtext: { fontSize: 14, lineHeight: 21 },
  apiLine: { fontSize: 12, lineHeight: 18 },
  navBtn: { minHeight: 52, borderWidth: 1, borderRadius: 18, justifyContent: 'center', paddingHorizontal: 16 },
  navBtnText: { fontSize: 17, fontWeight: '700' },
  accountState: { minHeight: 54, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 999 },
  accountStateText: { fontSize: 15, fontWeight: '700' },
  alert: { borderWidth: 1, borderRadius: 18, padding: 14 },
  alertText: { fontSize: 14, lineHeight: 21 },
  loader: { borderWidth: 1, borderRadius: 18, padding: 18, alignItems: 'center', gap: 10 },
  label: { fontSize: 13, fontWeight: '700' },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, fontSize: 15 },
  segmentWrap: { borderWidth: 1, borderRadius: 18, padding: 6, gap: 6 },
  segment: { minHeight: 42, borderWidth: 1, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 12 },
  segmentText: { fontSize: 14, fontWeight: '700' },
  btn: { minHeight: 48, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnText: { fontSize: 15, fontWeight: '800' },
  empty: { borderWidth: 1, borderRadius: 18, padding: 16 },
  card: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, fontWeight: '800' },
  price: { fontSize: 22, fontWeight: '800' },
  meta: { fontSize: 15, lineHeight: 22 },
  noteBox: { borderWidth: 1, borderRadius: 16, padding: 12 },
  noteText: { fontSize: 14, lineHeight: 21 },
  stack8: { gap: 8 },
  stack10: { gap: 10 },
});

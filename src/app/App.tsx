import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
} from "react-router"

type Shop = {
  id: string
  name: string
  genre: string
  distance: number
  walk: number
  wait: number
  eat: number
  people: number
  status: string
  image: string
  score: number
  updated: number
  source: "店舗入力" | "自動推定"
  address: string
}
type Settings = {
  minutes: number
  genres: string[]
  returnTrip: boolean
  area: string
}
type Sort = "最短で食べられる順" | "待ち時間が短い順" | "距離が近い順" | "評価が高い順"
const initialShops: Shop[] = [
  {
    id: "toru",
    name: "麺屋 透",
    genre: "鶏白湯・塩",
    distance: 450,
    walk: 5,
    wait: 6,
    eat: 17,
    people: 3,
    status: "普通",
    image:
      "https://images.unsplash.com/photo-1632709810780-b5a4343cebec?auto=format&fit=crop&w=900&q=85",
    score: 4.4,
    updated: Date.now() - 120000,
    source: "店舗入力",
    address: "東京都渋谷区道玄坂1-8-3",
  },
  {
    id: "issen",
    name: "中華そば 一閃",
    genre: "醤油・煮干し",
    distance: 700,
    walk: 8,
    wait: 3,
    eat: 16,
    people: 1,
    status: "空き",
    image:
      "https://images.unsplash.com/photo-1614563637806-1d0e645e0940?auto=format&fit=crop&w=900&q=85",
    score: 4.2,
    updated: Date.now() - 240000,
    source: "自動推定",
    address: "東京都渋谷区宇田川町",
  },
  {
    id: "club",
    name: "TOKYO 豚骨 CLUB",
    genre: "豚骨・細麺",
    distance: 550,
    walk: 7,
    wait: 14,
    eat: 18,
    people: 8,
    status: "混雑",
    image:
      "https://images.unsplash.com/photo-1573241927154-420274a2711f?auto=format&fit=crop&w=900&q=85",
    score: 4.6,
    updated: Date.now() - 420000,
    source: "自動推定",
    address: "東京都渋谷区神南1丁目",
  },
]
const tastes = [
  "醤油",
  "味噌",
  "塩",
  "豚骨",
  "家系",
  "二郎系",
  "つけ麺",
  "まぜそば",
]
const sorts: Sort[] = [
  "最短で食べられる順",
  "待ち時間が短い順",
  "距離が近い順",
  "評価が高い順",
]
interface TravelEstimate {
  walk: number
  distance: number
}
const areas: Record<string, Record<string, TravelEstimate>> = {
  "渋谷駅 ハチ公口付近": {
    toru: { walk: 5, distance: 450 },
    issen: { walk: 8, distance: 700 },
    club: { walk: 7, distance: 550 },
  },
  道玄坂交差点付近: {
    toru: { walk: 2, distance: 160 },
    issen: { walk: 6, distance: 480 },
    club: { walk: 9, distance: 720 },
  },
  宮下公園付近: {
    toru: { walk: 10, distance: 800 },
    issen: { walk: 4, distance: 320 },
    club: { walk: 3, distance: 240 },
  },
}
const duration = (shop: Shop, returning: boolean) =>
  shop.walk + shop.wait + shop.eat + (returning ? shop.walk : 0)
const clock = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
const age = (shop: Shop, now: number) =>
  Math.max(0, Math.floor((now - shop.updated) / 60000))
const marginText = (margin: number) =>
  margin < 0
    ? `約${-margin}分オーバー`
    : margin === 0
      ? "余裕0分・ギリギリ"
      : `残り${margin}分の余裕`
const tone = (margin: number) =>
  margin < 0
    ? "bg-red-50 text-red-700"
    : margin <= 5
      ? "bg-amber-50 text-amber-800"
      : "bg-emerald-50 text-emerald-800"
function readSaved<T>(
  key: string,
  fallback: T,
  valid: (value: unknown) => boolean,
): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "null")
    return valid(value) ? value as T : fallback
  } catch {
    return fallback
  }
}
type Store = {
  settings: Settings
  setSettings: (value: Settings) => void
  shops: Shop[]
  selected: Shop
  select: (shop: Shop) => void
  favorites: string[]
  toggleFavorite: (id: string) => void
  sort: Sort
  setSort: (value: Sort) => void
  now: number
  updateShop: (people: number, status: string) => void
  storageError: boolean
  deadline: string
  setDeadline: (value: string) => void
}
const Context = createContext<Store | null>(null)
function useStore() {
  return useContext(Context)!
}
interface GlyphProps {
  name: string
  className?: string
}
function Glyph({ name, className = "" }: GlyphProps) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    back: <path d="m15 5-7 7 7 7" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    heart: <path d="M12 21 3 12a5 5 0 0 1 9-7 5 5 0 0 1 9 7Z" />,
    location: (
      <>
        <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="m15 15 6 6" />
      </>
    ),
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15M15 6v15" />
      </>
    ),
    shop: (
      <>
        <path d="M4 10v11h16V10M3 4h18l-2 6H5ZM9 21v-7h6v7" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
  }
  return (
    <svg
      className={`h-5 w-5 shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.clock}
    </svg>
  )
}
function Action({
  children,
  onClick,
  light = false,
}: {
  children: ReactNode
  onClick: () => void
  light?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl px-5 text-sm font-bold transition active:scale-[.98] ${
        light
          ? "border border-border bg-white text-foreground"
          : "bg-foreground text-white"
      }`}
    >
      {children}
    </button>
  )
}
function Brand() {
  return (
    <span className="flex items-center gap-2.5 text-base font-black">
      <span className="grid h-9 w-9 -skew-x-6 place-items-center rounded-[10px_3px_10px_3px] bg-foreground font-black italic text-[#f6bd8d]">
        S
      </span>
      スルッと啜る
      <span className="mt-1 text-[9px] font-medium text-muted-foreground">
        ®
      </span>
    </span>
  )
}
function Layout() {
  const [settings, setSettings] = useState<Settings>(() =>
    readSaved(
      "susuru-settings",
      {
        minutes: 30,
        genres: [],
        returnTrip: false,
        area: "渋谷駅 ハチ公口付近",
      },
      (value) => {
        if (!value || typeof value !== "object") return false
        const candidate = value as Partial<Settings>
        return (
          Number.isInteger(candidate.minutes) &&
          candidate.minutes! >= 1 &&
          candidate.minutes! <= 180 &&
          typeof candidate.returnTrip === "boolean" &&
          typeof candidate.area === "string" &&
          Object.prototype.hasOwnProperty.call(areas, candidate.area) &&
          Array.isArray(candidate.genres) &&
          candidate.genres.every((genre) => tastes.includes(genre))
        )
      },
    ),
  )
  const [shops, setShops] = useState(initialShops)
  const [selectedId, setSelectedId] = useState("toru")
  const [favorites, setFavorites] = useState<string[]>(() =>
    readSaved(
      "susuru-favorites",
      [],
      (value) =>
        Array.isArray(value) &&
        value.every(
          (id) =>
            typeof id === "string" &&
            initialShops.some((shop) => shop.id === id),
        ),
    ),
  )
  const [storageError, setStorageError] = useState(false)
  const [sort, setSort] = useState<Sort>(sorts[0])
  const [now, setNow] = useState(Date.now())
  const [deadline, setDeadline] = useState(() => clock(Date.now() + 45 * 60000))
  const location = useLocation()
  useEffect(() => {
    try {
      localStorage.setItem("susuru-settings", JSON.stringify(settings))
    } catch {
      setStorageError(true)
    }
  }, [settings])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((item) => item !== id)
      : [...favorites, id]
    setFavorites(next)
    try {
      localStorage.setItem("susuru-favorites", JSON.stringify(next))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }
  const updateShop = (people: number, status: string) =>
    setShops((current) =>
      current.map((shop) =>
        shop.id === "toru"
          ? {
              ...shop,
              people,
              wait: people * 2,
              status,
              updated: Date.now(),
              source: "店舗入力",
            }
          : shop,
      ),
    )
  const locatedShops = shops.map((shop) => ({
    ...shop,
    ...areas[settings.area][shop.id],
  }))
  const store: Store = {
    settings,
    setSettings,
    shops: locatedShops,
    selected: locatedShops.find((shop) => shop.id === selectedId)!,
    select: (shop) => setSelectedId(shop.id),
    favorites,
    toggleFavorite,
    sort,
    setSort,
    now,
    updateShop,
    storageError,
    deadline,
    setDeadline,
  }
  return (
    <Context.Provider value={store}>
      <div className="min-h-screen bg-[#e7e5df] text-foreground">
        <Outlet />
        {storageError && (
          <div
            role="status"
            className="fixed bottom-24 left-1/2 z-50 w-80 -translate-x-1/2 rounded-xl bg-foreground p-4 text-xs text-white"
          >
            このブラウザでは保存できません。検索条件・お気に入りは今回の利用中のみ保持します。
          </div>
        )}
      </div>
    </Context.Provider>
  )
}
const deviceSafeTop =
  "pt-[max(3.5rem,env(safe-area-inset-top,0px))] min-[481px]:pt-[env(safe-area-inset-top,0px)]"
function Shell({
  children,
  title,
  back,
  nav = true,
}: {
  children: ReactNode
  title?: string
  back?: string
  nav?: boolean
}) {
  const navigate = useNavigate()
  const path = useLocation().pathname
  return (
    <div
      className={`mx-auto min-h-screen max-w-[480px] bg-background pb-24 shadow-xl shadow-black/5 ${deviceSafeTop}`}
    >
      <header className="flex h-[72px] items-center justify-between px-5">
        {back ? (
          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-white"
            aria-label="戻る"
            onClick={() => navigate(back)}
          >
            <Glyph name="back" />
          </button>
        ) : (
          <Brand />
        )}
        {title && <p className="text-sm font-bold">{title}</p>}
        <button
          onClick={() => navigate("/admin")}
          aria-label="店舗管理を開く"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-white"
        >
          <Glyph name="shop" />
        </button>
      </header>
      {children}
      {nav && (
        <nav className="fixed bottom-0 left-1/2 z-30 flex h-20 w-full max-w-[480px] -translate-x-1/2 items-center justify-around border-t border-border bg-white/95 pb-2 backdrop-blur-xl">
          {[
            ["/", "home", "ホーム"],
            ["/results", "search", "お店"],
            ["/map", "map", "マップ"],
            ["/favorites", "heart", "保存"],
          ].map(([url, icon, label]) => (
            <button
              key={url}
              aria-current={path === url ? "page" : undefined}
              onClick={() => navigate(url)}
              className={`flex min-w-16 flex-col items-center gap-1.5 text-[10px] ${
                path === url
                  ? "font-bold text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Glyph name={icon} />
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[10px] font-bold tracking-[.18em] text-muted-foreground">
      <span className="h-0.5 w-6 bg-primary" />
      {children}
    </p>
  )
}
function ConditionSummary() {
  const { settings } = useStore()
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate("/setup")}
      className="flex w-full flex-wrap items-center gap-1.5 text-left text-[11px] text-muted-foreground"
    >
      {[
        `${settings.minutes}分以内`,
        settings.genres.length ? settings.genres.join("・") : "味はなんでも",
        settings.area,
        settings.returnTrip ? "戻るまで" : "食べ終わるまで",
      ].map((text) => (
        <span
          key={text}
          className="rounded-full border border-border bg-white px-2.5 py-1.5"
        >
          {text}
        </span>
      ))}
    </button>
  )
}
function TimePicker({ custom = false }: { custom?: boolean }) {
  const { settings, setSettings } = useStore()
  const navigate = useNavigate()
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {[15, 30, 45, 60].map((value) => (
          <button
            key={value}
            aria-pressed={settings.minutes === value}
            onClick={() => setSettings({ ...settings, minutes: value })}
            className={`flex h-[78px] items-baseline justify-center gap-1 rounded-xl border pt-5 ${
              settings.minutes === value
                ? "border-foreground bg-foreground text-white shadow-[inset_0_-4px_0_#dc4e20]"
                : "border-border bg-white"
            }`}
          >
            <span className="text-[30px] font-black tabular-nums">{value}</span>
            <span className="text-xs">分</span>
          </button>
        ))}
      </div>
      {custom ? (
        <label className="mt-4 flex items-center justify-between text-sm">
          時間を指定（1〜180分）
          <input
            aria-label="使える時間"
            type="number"
            min={1}
            max={180}
            value={settings.minutes}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (value >= 1 && value <= 180)
                setSettings({ ...settings, minutes: Math.floor(value) })
            }}
            className="w-24 rounded-lg border border-border bg-white p-2 text-center font-bold"
          />
        </label>
      ) : (
        <button
          onClick={() => navigate("/setup")}
          className="mt-3 w-full text-right text-[11px] text-muted-foreground underline underline-offset-4"
        >
          時間を自由に指定 ↗
        </button>
      )}
    </div>
  )
}
function ReturnToggle() {
  const { settings, setSettings } = useStore()
  return (
    <div className="grid grid-cols-2 rounded-xl bg-[#eae8e1] p-1">
      {[false, true].map((value) => (
        <button
          key={String(value)}
          aria-pressed={settings.returnTrip === value}
          onClick={() => setSettings({ ...settings, returnTrip: value })}
          className={`min-h-11 rounded-lg text-[11px] font-bold ${
            settings.returnTrip === value
              ? "bg-white shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          {settings.returnTrip === value ? "● " : "○ "}
          {value ? "今いる場所に戻るまで" : "食べ終わるまで"}
        </button>
      ))}
    </div>
  )
}
function Genres() {
  const { settings, setSettings } = useStore()
  return (
    <div className="flex flex-wrap gap-2">
      {["なんでも", ...tastes].map((genre) => {
        const active =
          genre === "なんでも"
            ? !settings.genres.length
            : settings.genres.includes(genre)
        return (
          <button
            key={genre}
            aria-pressed={active}
            onClick={() =>
              setSettings({
                ...settings,
                genres:
                  genre === "なんでも"
                    ? []
                    : settings.genres.includes(genre)
                      ? settings.genres.filter((item) => item !== genre)
                      : [...settings.genres, genre],
              })
            }
            className={`min-h-10 rounded-full border px-4 text-xs ${
              active
                ? "border-primary bg-[#f8e7de] font-bold text-[#a43b16]"
                : "border-border bg-white text-muted-foreground"
            }`}
          >
            {genre}
          </button>
        )
      })}
    </div>
  )
}
function LocationSetting() {
  const { settings, setSettings } = useStore()
  const [message, setMessage] = useState("")
  const [locating, setLocating] = useState(false)
  const locate = () => {
    if (!navigator.geolocation) {
      setMessage("位置情報に対応していません。エリアを指定してください。")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        setMessage(
          `現在地を取得：${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}。実店舗の位置・経路データ未接続のため、検索には下のデモエリアを使用します。`,
        )
      },
      () => {
        setLocating(false)
        setMessage("現在地を取得できませんでした。エリアを指定してください。")
      },
      { timeout: 10000 },
    )
  }
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="flex items-center gap-2 text-[11px] font-bold">
        <Glyph name="location" className="text-primary" />
        検索地点：{settings.area}
      </p>
      <p className="mt-2 text-[10px] text-muted-foreground">
        デモエリア · 徒歩時間はサンプル推定値
      </p>
      <div className="mt-3 flex gap-2">
        <button
          disabled={locating}
          onClick={locate}
          className="min-h-10 rounded-lg bg-muted px-3 text-[11px] font-bold disabled:opacity-50"
        >
          {locating ? "取得中…" : "現在地を取得"}
        </button>
        <label className="flex min-h-10 flex-1 items-center rounded-lg border border-border px-2">
          <span className="sr-only">駅・エリアを指定</span>
          <select
            value={settings.area}
            onChange={(event) =>
              setSettings({ ...settings, area: event.target.value })
            }
            className="w-full bg-transparent text-[11px]"
          >
            {Object.keys(areas).map((area) => (
              <option key={area}>{area}</option>
            ))}
          </select>
        </label>
      </div>
      {message && (
        <p
          role="status"
          className="mt-3 text-[11px] leading-relaxed text-muted-foreground"
        >
          {message}
        </p>
      )}
    </div>
  )
}
function getVisible(store: Store) {
  return store.shops
    .filter(
      (shop) =>
        !store.settings.genres.length ||
        store.settings.genres.some((genre) => shop.genre.includes(genre)),
    )
    .sort((first, second) =>
      store.sort === sorts[1]
        ? first.wait - second.wait
        : store.sort === sorts[2]
          ? first.distance - second.distance
          : store.sort === sorts[3]
            ? second.score - first.score
            : duration(first, store.settings.returnTrip) -
              duration(second, store.settings.returnTrip),
    )
}
function Home() {
  const store = useStore()
  const navigate = useNavigate()
  const fitting = getVisible(store).filter(
    (shop) =>
      duration(shop, store.settings.returnTrip) <= store.settings.minutes,
  ).length
  return (
    <Shell>
      <main className="px-5 pb-6">
        <div className="pt-5">
          <Eyebrow>LUNCH, WITHOUT THE WAIT.</Eyebrow>
          <h1 className="mt-5 text-[clamp(30px,9vw,40px)] font-black leading-[1.25] tracking-[-.025em]">
            あと何分、
            <br />
            <span className="text-primary">ラーメン</span>に使える？
          </h1>
          <p className="mb-7 mt-4 text-xs leading-7 text-muted-foreground">
            移動も、待ち時間も、食べる時間も。
            <br />
            ぜんぶ見えるから、次の予定に間に合う。
          </p>
        </div>
        <TimePicker />
        <div className="mt-4">
          <ReturnToggle />
        </div>
        <div className="mb-4 mt-5">
          <LocationSetting />
        </div>
        <Action onClick={() => navigate("/results")}>
          <Glyph name="search" />
          この条件で、間に合う一杯を探す
          <Glyph name="arrow" />
        </Action>
        <div className="mt-3">
          <ConditionSummary />
        </div>
        <div className="mb-3 mt-7 flex items-baseline justify-between">
          <h2 className="text-sm font-bold">
            味は、気分で。
            <span className="ml-2 text-[10px] font-normal text-muted-foreground">
              指定しなくてもOK
            </span>
          </h2>
          <button
            onClick={() => navigate("/setup")}
            className="text-xs text-muted-foreground"
          >
            条件設定 ↗
          </button>
        </div>
        <Genres />
        <button
          onClick={() => navigate("/results")}
          className="mt-6 flex w-full items-center justify-between rounded-[18px_5px_18px_5px] bg-[#f1e4d5] p-5 text-left"
        >
          <div>
            <p className="text-[9px] font-bold tracking-[.16em] text-[#77543b]">
              YOUR TIME. YOUR RAMEN.
            </p>
            <p className="mt-2 text-sm font-bold">
              {store.settings.minutes}分以内に
              {store.settings.returnTrip ? "戻れる" : "食べ終われる"}見込み{" "}
              <span className="text-2xl text-primary">{fitting}</span>軒
            </p>
          </div>
          <Glyph name="arrow" />
        </button>
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
          サンプル3店舗のデモです。所要時間は目安であり、到着・退店時刻を保証しません。
        </p>
      </main>
    </Shell>
  )
}
function Setup() {
  const navigate = useNavigate()
  return (
    <Shell title="時間・ジャンル設定" back="/" nav={false}>
      <main className="space-y-6 px-5 pt-5">
        <Eyebrow>01 / TIME FIRST</Eyebrow>
        <h2 className="text-3xl font-black">使える時間は？</h2>
        <TimePicker custom />
        <ReturnToggle />
        <LocationSetting />
        <div className="border-t border-border pt-6">
          <Eyebrow>02 / TASTE OPTIONAL</Eyebrow>
          <h2 className="mb-5 mt-3 text-2xl font-bold">食べたい一杯は？</h2>
          <Genres />
          <p className="mt-3 text-xs text-muted-foreground">
            複数選択OK。「なんでも」で絞り込みを解除。
          </p>
        </div>
        <ConditionSummary />
        <Action onClick={() => navigate("/results")}>
          <Glyph name="search" />
          この条件で探す
          <Glyph name="arrow" />
        </Action>
      </main>
    </Shell>
  )
}
function SaveButton({ shop }: { shop: Shop }) {
  const { favorites, toggleFavorite } = useStore()
  const saved = favorites.includes(shop.id)
  return (
    <button
      onClick={() => toggleFavorite(shop.id)}
      aria-label={`${shop.name}を${saved ? "保存から削除" : "保存"}`}
      aria-pressed={saved}
      className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-white/95 ${
        saved ? "text-primary" : "text-foreground"
      }`}
    >
      <Glyph name="heart" className={saved ? "fill-current" : ""} />
    </button>
  )
}
function ShopCard({ shop }: { shop: Shop }) {
  const store = useStore()
  const navigate = useNavigate()
  const total = duration(shop, store.settings.returnTrip)
  const margin = store.settings.minutes - total
  return (
    <article className="overflow-hidden rounded-[20px_6px_20px_6px] border border-border bg-white">
      <div className="relative h-36">
        <button
          onClick={() => {
            store.select(shop)
            navigate("/detail")
          }}
          className="h-full w-full"
          aria-label={`${shop.name}の詳細`}
        >
          <img
            src={shop.image}
            alt={`${shop.genre}ラーメンの参考写真`}
            className="h-full w-full object-cover"
          />
        </button>
        <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold">
          ★ {shop.score}{" "}
          <span className="font-normal text-muted-foreground">デモ評価</span>
        </span>
        <div className="absolute right-3 top-3">
          <SaveButton shop={shop} />
        </div>
      </div>
      <button
        onClick={() => {
          store.select(shop)
          navigate("/detail")
        }}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground">
              今から{store.settings.returnTrip ? "戻る" : "食べ終わる"}まで
            </p>
            <p className="mt-1 text-sm font-bold">
              <span className="text-[38px] font-black leading-none tabular-nums">
                {total}
              </span>{" "}
              分で完了
            </p>
          </div>
          <div className={`rounded-xl px-3 py-2 text-center ${tone(margin)}`}>
            <p className="text-[10px] font-bold">
              {margin < 0
                ? "時間内は厳しそう"
                : margin <= 5
                  ? "ギリギリの見込み"
                  : "時間内に完了見込み"}
            </p>
            <p className="mt-1 text-[22px] font-black leading-tight tabular-nums">
              {margin < 0 ? `約${-margin}分` : `残り${margin}分`}
            </p>
            <p className="mt-1 text-[10px] font-bold">
              {margin < 0 ? "オーバー" : "の余裕"}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs">
            予想待ち <strong className="text-lg">{shop.wait}分</strong>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {age(shop, store.now)}分前更新 · {shop.source}
          </p>
        </div>
        {age(shop, store.now) >= 10 && (
          <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800">
            更新が古い情報です。待ち時間が変わっている可能性があります。
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">{shop.name}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {shop.genre}
            </p>
          </div>
          <Glyph name="arrow" className="text-muted-foreground" />
        </div>
      </button>
    </article>
  )
}
function Results() {
  const store = useStore()
  const navigate = useNavigate()
  const visible = getVisible(store)
  const fit = visible.filter(
    (shop) =>
      duration(shop, store.settings.returnTrip) <= store.settings.minutes,
  ).length
  return (
    <Shell title="検索結果" back="/">
      <main className="px-5 pt-3">
        <Eyebrow>EVERY MINUTE COUNTS.</Eyebrow>
        <h1 className="mt-4 text-[25px] font-black">
          あなたの残り時間：
          <span className="text-primary">{store.settings.minutes}分</span>
        </h1>
        <p className="mb-4 mt-2 text-xs text-muted-foreground">
          {store.settings.returnTrip ? "帰路も含めて戻れる" : "食べ終われる"}
          見込み {fit}軒 / 全{visible.length}軒
        </p>
        <ConditionSummary />
        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs font-bold">所要時間から選ぶ</span>
          <button
            onClick={() => navigate("/map")}
            className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-2 text-xs"
          >
            <Glyph name="map" />
            マップ
          </button>
        </div>
        <label className="mb-4 mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          並び替え
          <select
            aria-label="並び替え"
            value={store.sort}
            onChange={(event) => store.setSort(event.target.value as Sort)}
            className="max-w-[200px] rounded-lg border border-border bg-white p-2 text-foreground"
          >
            {sorts.map((sort) => (
              <option key={sort}>{sort}</option>
            ))}
          </select>
        </label>
        <div className="space-y-4">
          {visible.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
        {!visible.length && (
          <Empty>
            このジャンルの店舗はありません。
            <button
              onClick={() => navigate("/setup")}
              className="mt-4 block w-full font-bold text-primary"
            >
              味の条件を変更する →
            </button>
          </Empty>
        )}
        <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
          時間超過の店舗も比較用に表示。5分以下の余裕は「ギリギリ」です。待ち時間は混雑により変動します。
        </p>
      </main>
    </Shell>
  )
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 rounded-2xl border border-dashed border-border p-8 text-center text-sm leading-7 text-muted-foreground">
      {children}
    </div>
  )
}
function MapScreen() {
  const store = useStore()
  const navigate = useNavigate()
  const visible = getVisible(store)
  const positions: Record<string, string> = {
    toru: "left-[18%] top-[28%]",
    issen: "right-[12%] top-[17%]",
    club: "right-[18%] top-[62%]",
  }
  return (
    <Shell title="時間で見るマップ" back="/results">
      <div className="px-5 pb-4">
        <h1 className="mb-3 text-lg font-bold">
          あなたの残り時間：{store.settings.minutes}分
        </h1>
        <ConditionSummary />
        <p className="mt-3 text-[11px] font-bold">
          数字＝今から
          {store.settings.returnTrip ? "現在地へ戻る" : "食べ終わる"}まで
        </p>
        <div className="mt-3 flex gap-4 text-[10px]">
          <span className="text-emerald-700">● 余裕あり</span>
          <span className="text-amber-700">● ギリギリ（5分以下）</span>
          <span className="text-red-700">● 時間超過</span>
        </div>
      </div>
      <div className="relative h-[390px] overflow-hidden border-y border-border bg-[#e8e8de]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_94%,#faf9f5_94%),linear-gradient(transparent_92%,#faf9f5_92%)] bg-[size:80px_70px]" />
        <div className="absolute -left-10 top-40 h-10 w-[600px] -rotate-[30deg] border-y border-[#d4d4c9] bg-white" />
        <div className="absolute left-[45%] top-0 h-full w-8 rotate-12 bg-[#cfd6c2]" />
        <span className="absolute bottom-9 left-6 text-xs text-[#969487]">
          道玄坂
        </span>
        <span className="absolute right-5 top-4 text-xs text-[#969487]">
          宮下公園
        </span>
        <span className="absolute left-[43%] top-[52%] rounded-full border-[5px] border-white bg-[#527797] p-2 shadow-[0_0_0_12px_#52779720]" />
        <span className="absolute left-[33%] top-[63%] rounded bg-white/90 px-2 py-1 text-[10px]">
          検索地点 · {store.settings.area}
        </span>
        {visible.map((shop) => {
          const total = duration(shop, store.settings.returnTrip)
          const margin = store.settings.minutes - total
          return (
            <button
              key={shop.id}
              onClick={() => {
                store.select(shop)
                navigate("/detail")
              }}
              className={`absolute ${positions[shop.id]} rounded-[14px_14px_14px_3px] border-2 border-white px-4 py-2 shadow-lg ${
                margin < 0
                  ? "bg-[#b84736] text-white"
                  : margin <= 5
                    ? "bg-[#eed395] text-[#493a1b]"
                    : "bg-[#367a60] text-white"
              }`}
              aria-label={`${shop.name}、${total}分、${marginText(margin)}`}
            >
              <span className="text-2xl font-black">{total}</span>
              <span className="text-xs">分</span>
              <span className="block text-[9px]">{shop.name}</span>
            </button>
          )
        })}
        <span className="absolute bottom-3 right-3 rounded bg-white/85 px-2 py-1 text-[9px]">
          概念図 · 実際の位置・縮尺ではありません
        </span>
      </div>
      <div className="space-y-4 p-5">
        {visible.length ? (
          visible.map((shop) => <ShopCard key={shop.id} shop={shop} />)
        ) : (
          <Empty>該当する店舗がありません。</Empty>
        )}
      </div>
    </Shell>
  )
}
function RouteButton({ shop }: { shop: Shop }) {
  const open = () =>
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${shop.name} ${shop.address}`)}&travelmode=walking`,
      "_blank",
      "noopener,noreferrer",
    )
  return (
    <Action onClick={open}>
      <Glyph name="map" />
      経路を開く
      <Glyph name="arrow" />
    </Action>
  )
}
function Detail() {
  const store = useStore()
  const shop = store.selected
  const navigate = useNavigate()
  const total = duration(shop, store.settings.returnTrip)
  const margin = store.settings.minutes - total
  return (
    <Shell title="店舗詳細" back="/results" nav={false}>
      <div className="relative h-60">
        <img
          src={shop.image}
          alt={`${shop.genre}ラーメンの参考写真`}
          className="h-full w-full object-cover"
        />
        <div className="absolute right-4 top-4">
          <SaveButton shop={shop} />
        </div>
        <span className="absolute bottom-4 right-4 rounded-full bg-black/65 px-3 py-1 text-[9px] text-white">
          参考写真 · デモ店舗
        </span>
      </div>
      <main className="relative -mt-4 rounded-t-3xl bg-background px-5 pt-6">
        <p className="text-xs text-muted-foreground">
          {shop.genre}　★ {shop.score}（デモ評価）
        </p>
        <h1 className="mt-2 text-3xl font-black">{shop.name}</h1>
        <div className="mt-5">
          <ConditionSummary />
        </div>
        <div className="mt-5 rounded-[20px_5px_20px_5px] bg-foreground p-5 text-white">
          <p className="text-[11px] text-white/65">
            あなたの残り時間 {store.settings.minutes}分 /{" "}
            {store.settings.returnTrip ? "戻るまで" : "食べ終わるまで"}
          </p>
          <p className="mt-2 text-lg font-bold">
            <strong className="text-5xl font-black">{total}</strong> 分で完了
          </p>
          <p
            className={`mt-4 inline-block rounded-lg px-3 py-2 text-sm font-bold ${tone(margin)}`}
          >
            {margin < 0
              ? "時間内は厳しそう"
              : `${store.settings.minutes}分以内に${
                  store.settings.returnTrip ? "戻れる" : "食べ終われる"
                }見込み`}{" "}
            · {marginText(margin)}
          </p>
          <p className="mt-3 text-[11px] text-white/70">
            予想完了 {clock(store.now + total * 60000)}　※目安
          </p>
        </div>
        <div className="my-5 grid grid-cols-4 gap-2 text-center">
          {[
            ["移動", shop.walk],
            ["待機", shop.wait],
            ["食事目安", shop.eat],
            ...(store.settings.returnTrip ? [["帰路", shop.walk]] : []),
          ].map(([label, minutes]) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-white py-3"
            >
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="mt-2 text-base font-bold">{minutes}分</p>
            </div>
          ))}
        </div>
        <section className="rounded-2xl border border-border bg-white p-5">
          <div className="flex justify-between text-xs">
            <h2 className="font-bold">いまの待ち時間</h2>
            <span className="text-muted-foreground">
              {age(shop, store.now)}分前更新
            </span>
          </div>
          <p className="mt-4 text-lg">
            予想待ち{" "}
            <strong className="text-3xl font-black">{shop.wait}分</strong>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {shop.people}人待ち · {shop.status} · 回転：速め（デモ）
          </p>
          <p className="mt-4 border-t border-border pt-3 text-[10px] leading-6 text-muted-foreground">
            情報源：{shop.source}（デモ）
            {age(shop, store.now) >= 10
              ? " · 更新が古いため余裕を持ってください"
              : ""}
            <br />
            自動推定はサンプル値です。実データ・予測精度は未検証。
          </p>
        </section>
        <button
          onClick={() => navigate("/simulation")}
          className="my-4 flex w-full items-center gap-3 rounded-2xl bg-[#f6e5d9] p-4 text-left"
        >
          <Glyph name="clock" className="text-primary" />
          <div className="flex-1">
            <p className="text-sm font-bold">終了時刻からシミュレーション</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              帰り道も含めて、間に合うか確認
            </p>
          </div>
          <Glyph name="arrow" />
        </button>
        <p className="mb-5 text-xs leading-7 text-muted-foreground">
          {shop.address}
          <br />
          現在のデモ地点から{shop.distance}m · 徒歩{shop.walk}分
        </p>
        <RouteButton shop={shop} />
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Google マップが開きます。予約・来店宣言ではありません。
        </p>
      </main>
    </Shell>
  )
}
function Simulation() {
  const store = useStore()
  const shop = store.selected
  const { settings } = store
  const target = new Date(store.now)
  const [hours, minutes] = store.deadline.split(":").map(Number)
  target.setHours(hours, minutes, 0, 0)
  const valid = Boolean(store.deadline) && Number.isFinite(target.getTime())
  const past = valid && target.getTime() <= store.now
  const total = duration(shop, settings.returnTrip)
  const available = valid
    ? Math.floor((target.getTime() - store.now) / 60000)
    : 0
  const margin = available - total
  const stages = [
    { label: "店舗へ移動", minutes: shop.walk },
    { label: "待機", minutes: shop.wait },
    { label: "食事", minutes: shop.eat },
    ...(settings.returnTrip
      ? [{ label: "現在地への帰路", minutes: shop.walk }]
      : []),
  ]
  let elapsed = 0
  return (
    <Shell title="時間シミュレーション" back="/detail" nav={false}>
      <main className="px-5 pt-5">
        <Eyebrow>YOUR NEXT PLAN, ON TIME.</Eyebrow>
        <h1 className="mt-4 text-2xl font-black">何時までに終えたい？</h1>
        <label className="mt-6 block rounded-2xl border border-border bg-white p-5">
          <span className="block text-xs text-muted-foreground">
            今日の終了時刻
          </span>
          <input
            type="time"
            aria-label="今日の終了時刻"
            value={store.deadline}
            onChange={(event) => store.setDeadline(event.target.value)}
            className="mt-3 w-full bg-transparent text-[48px] font-black tabular-nums"
          />
        </label>
        <div className="mt-4">
          <ReturnToggle />
        </div>
        <p className="my-3 text-[11px] text-muted-foreground">
          {settings.returnTrip
            ? "現在地へ戻る時刻で判定"
            : "食べ終わる時刻で判定"}{" "}
          · {shop.name}
        </p>
        {!valid || past ? (
          <div
            role="status"
            className="my-5 rounded-2xl bg-red-50 p-5 text-sm text-red-700"
          >
            {!valid
              ? "終了時刻を入力してください。"
              : "過去の時刻です。今日の現在時刻より後を指定してください。"}
          </div>
        ) : (
          <div
            className={`my-5 rounded-[20px_5px_20px_5px] p-5 ${tone(margin)}`}
          >
            <p className="text-xs">
              現在 {clock(store.now)} → 終了 {store.deadline} / あと{available}
              分
            </p>
            <h2 className="mt-3 text-2xl font-black">{marginText(margin)}</h2>
            <p className="mt-2 text-xs font-bold">
              {margin < 0
                ? "時間内は厳しそう"
                : margin <= 5
                  ? "間に合う見込みですが、余裕が少なめです"
                  : "この店なら時間内に完了する見込み"}
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="mb-5 text-xs font-bold">
            今からの予定{" "}
            <span className="float-right text-primary">合計{total}分</span>
          </p>
          {stages.map((stage, index) => {
            const start = store.now + elapsed * 60000
            elapsed += stage.minutes
            return (
              <div
                key={stage.label}
                className="flex items-start gap-4 border-l border-border pb-6 pl-5 last:pb-0"
              >
                <span className="-ml-[33px] grid h-6 w-6 place-items-center rounded-full bg-[#f2e1d4] text-[10px] font-bold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {stage.label}{" "}
                    <span className="float-right">{stage.minutes}分</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {clock(start)} → {clock(store.now + elapsed * 60000)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        <div className="my-5 flex items-center justify-between border-y border-border py-5">
          <span className="text-sm font-bold">
            {settings.returnTrip ? "戻り予定" : "食べ終わり予定"}
          </span>
          <strong className="text-3xl font-black">
            {clock(store.now + total * 60000)}
          </strong>
        </div>
        <p className="mb-5 text-[11px] leading-6 text-muted-foreground">
          予想時刻は混雑により前後します。移動時間は往復同じと仮定したデモ値です。時間ぴったりではなく、余裕を持った移動をおすすめします。
        </p>
        <RouteButton shop={shop} />
      </main>
    </Shell>
  )
}
function Favorites() {
  const store = useStore()
  const navigate = useNavigate()
  const saved = store.shops
    .filter((shop) => store.favorites.includes(shop.id))
    .sort(
      (first, second) =>
        duration(first, store.settings.returnTrip) -
        duration(second, store.settings.returnTrip),
    )
  return (
    <Shell title="お気に入り">
      <main className="px-5 pt-5">
        <Eyebrow>YOUR REGULARS.</Eyebrow>
        <h1 className="my-5 text-3xl font-black leading-snug">
          いつもの一杯を、
          <br />
          待たずに。
        </h1>
        <p className="mb-4 text-xs text-muted-foreground">
          保存した{saved.length}店舗 · あなたの残り時間 {store.settings.minutes}
          分
        </p>
        <ConditionSummary />
        <div className="mt-5 space-y-4">
          {saved.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
        {!saved.length && (
          <Empty>
            まだ保存したお店はありません。
            <br />
            お店の♡を押して、いつもの一杯を保存。
            <button
              onClick={() => navigate("/results")}
              className="mt-4 block w-full font-bold text-primary"
            >
              お店を探す →
            </button>
          </Empty>
        )}
        <p className="mt-4 text-[10px] text-muted-foreground">
          お気に入りはこのブラウザに保存されます。
        </p>
      </main>
    </Shell>
  )
}
function Admin() {
  const store = useStore()
  const navigate = useNavigate()
  const shop = store.shops[0]
  const [notice, setNotice] = useState("")
  const update = (people: number, status = shop.status) => {
    store.updateShop(people, status)
    setNotice("反映しました。顧客画面の待ち時間も更新されています。")
  }
  return (
    <div
      className={`mx-auto flex min-h-screen max-w-[1440px] bg-background ${deviceSafeTop}`}
    >
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-white p-7 lg:flex">
        <Brand />
        <p className="mb-12 ml-11 mt-2 text-[9px] tracking-widest text-muted-foreground">
          FOR RESTAURANTS
        </p>
        <p className="rounded-xl bg-foreground p-4 text-sm font-bold text-white">
          ▦ ダッシュボード
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-5 p-4 text-left text-sm text-muted-foreground"
        >
          ↗ 顧客画面を見る
        </button>
        <div className="mt-auto rounded-xl bg-muted p-4">
          <p className="text-sm font-bold">麺屋 透</p>
          <p className="mt-1 text-xs text-muted-foreground">
            渋谷道玄坂店 · デモ店舗
          </p>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-10">
        <header className="mb-8 flex flex-col items-start justify-between gap-4 min-[481px]:flex-row min-[481px]:flex-wrap min-[481px]:items-center">
          <div>
            <p className="text-xs text-muted-foreground">
              {new Date(store.now).toLocaleDateString("ja-JP", {
                dateStyle: "full",
              })}
            </p>
            <h1 className="mt-2 text-3xl font-black">今日の店舗状況</h1>
          </div>
          <button
            onClick={() => navigate("/")}
            className="rounded-full border border-border bg-white px-4 py-3 text-xs"
          >
            顧客画面を見る ↗
          </button>
        </header>
        <div className="mb-6 rounded-xl bg-[#f0e5d8] px-4 py-3 text-xs leading-6">
          店舗管理デモ ·
          更新は今回の利用中、顧客画面に即時反映。サーバーへの送信・他端末への共有は未接続です。
        </div>
        <section className="rounded-[24px_6px_24px_6px] border border-border bg-white p-5 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow>LIVE CONTROL / 麺屋 透</Eyebrow>
            <p className="text-xs text-muted-foreground">
              最終更新 {age(shop, store.now)}分前 · {shop.source}
            </p>
          </div>
          <h2 className="mt-4 text-xl font-bold">営業中は、ワンタップで。</h2>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-background p-6">
            <div>
              <p className="text-xs text-muted-foreground">現在の待ち人数</p>
              <p className="mt-2 text-6xl font-black tabular-nums">
                {shop.people}
                <span className="ml-2 text-lg">人</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => update(Math.max(0, shop.people - 1))}
                aria-label="待ち人数を1人減らす"
                disabled={shop.people === 0}
                className="grid h-20 w-20 place-items-center rounded-2xl border border-border bg-white disabled:opacity-30"
              >
                <Glyph name="minus" className="h-8 w-8" />
              </button>
              <button
                onClick={() => update(shop.people + 1)}
                aria-label="待ち人数を1人増やす"
                className="grid h-20 w-20 place-items-center rounded-2xl bg-foreground text-white"
              >
                <Glyph name="plus" className="h-8 w-8" />
              </button>
            </div>
            <div className="border-l border-border pl-5">
              <p className="text-xs text-muted-foreground">予想待ち時間</p>
              <p className="mt-2 text-4xl font-black text-primary">
                {shop.wait}
                <span className="ml-1 text-base">分</span>
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                人数 × 2分で自動計算（デモ）
              </p>
            </div>
          </div>
          <p className="mb-3 mt-6 text-xs font-bold">
            混雑度をタップして即時反映
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {["空き", "普通", "混雑", "激混み"].map((status, index) => (
              <button
                key={status}
                aria-pressed={shop.status === status}
                onClick={() => update(shop.people, status)}
                className={`min-h-20 rounded-2xl border text-lg font-bold ${
                  shop.status === status
                    ? "border-foreground bg-foreground text-white"
                    : "border-border bg-white"
                }`}
              >
                <span
                  className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${["bg-emerald-500", "bg-[#ccb47c]", "bg-orange-500", "bg-red-500"][index]}`}
                />
                {status}
              </button>
            ))}
          </div>
          <p role="status" className="mt-4 min-h-5 text-xs text-emerald-700">
            {notice || "保存ボタンは不要です。変更と同時に反映します。"}
          </p>
        </section>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            ["平均滞在時間", "17.4", "分", "着席から退店まで"],
            ["現在の回転率", "3.4", "回/時", "顧客側では「回転：速め」"],
            ["座席稼働率", "78", "%", "14 / 18席"],
          ].map(([label, value, unit, sub]) => (
            <section
              key={label}
              className="rounded-2xl border border-border bg-white p-6"
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="my-4 text-4xl font-black">
                {value}
                <span className="ml-2 text-sm font-medium">{unit}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {sub} · サンプル値
              </p>
            </section>
          ))}
        </div>
        <section className="mt-6 rounded-2xl border border-border bg-white p-6">
          <Eyebrow>ESTIMATION, NOT EXTRA WORK.</Eyebrow>
          <h2 className="mt-4 text-lg font-bold">
            更新が止まっても、判断の手がかりを。
          </h2>
          <p className="mt-3 max-w-2xl text-xs leading-7 text-muted-foreground">
            現在は店舗入力とサンプル推定値を区別して表示しています。最終更新から10分以上経過した情報には注意を表示。今後は店舗入力・ユーザーの混雑報告・過去データ・来店／退店データを組み合わせ、更新がない時間帯を自動推定で補う構想です。
          </p>
          <span className="mt-4 inline-block rounded-full bg-muted px-3 py-1.5 text-[10px]">
            自動推定エンジン・混雑報告は未接続
          </span>
        </section>
      </main>
    </div>
  )
}
const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "setup", Component: Setup },
      { path: "results", Component: Results },
      { path: "map", Component: MapScreen },
      { path: "detail", Component: Detail },
      { path: "simulation", Component: Simulation },
      { path: "favorites", Component: Favorites },
      { path: "admin", Component: Admin },
      { path: "*", Component: Home },
    ],
  },
])
export default function App() {
  return <RouterProvider router={router} />
}
